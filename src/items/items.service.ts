import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Item } from './entities/item.entity';
import { ItemEvent } from './entities/item-event.entity';
import { ItemCategory } from './entities/item-category.entity';
import { CategoryCustomField } from './entities/category-custom-field.entity';
import { ItemCustomValue } from './entities/item-custom-value.entity';
import { WarehouseStock } from '../warehouse/entities/warehouse-stock.entity';
import { Company } from '../companies/entities/company.entity';
import { UserRole, ItemStatus, ItemCondition, ItemEventType } from '../common/enums';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';
import { generateBarcodeString } from '../common/utils/barcode.util';
import { DistributeItemDto, AssignItemDto, ReportFaultDto } from './dto/item.dto';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item) private readonly itemsRepository: Repository<Item>,
    @InjectRepository(ItemEvent) private readonly eventsRepository: Repository<ItemEvent>,
    @InjectRepository(ItemCategory) private readonly categoriesRepository: Repository<ItemCategory>,
    @InjectRepository(WarehouseStock) private readonly stockRepository: Repository<WarehouseStock>,
    @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
    @InjectRepository(CategoryCustomField) private readonly fieldRepository: Repository<CategoryCustomField>,
    @InjectRepository(ItemCustomValue) private readonly valueRepository: Repository<ItemCustomValue>,
    private dataSource: DataSource,
  ) {}

  // The AliExpress timeline fetcher
  async getTimeline(barcodeOrId: string, companyId?: string, role?: UserRole): Promise<any> {
    const isBarcode = !barcodeOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    
    let whereClause = isBarcode ? { barcode: barcodeOrId } : { id: barcodeOrId };
    
    const item = await this.itemsRepository.findOne({
      where: whereClause,
      relations: [
        'category',
        'currentDepartment',
        'currentAssignedUser',
        'customValues',
        'customValues.fieldDefinition'
      ]
    });

    if (!item) throw new NotFoundException('Item not found');

    if (role !== UserRole.SUPER_ADMIN && item.companyId !== companyId) {
      throw new ForbiddenException('You do not have permission to view this item');
    }

    const events = await this.eventsRepository.find({
      where: { itemId: item.id },
      relations: ['fromDepartment', 'toDepartment', 'fromUser', 'toUser', 'performedByUser'],
      order: { createdAt: 'DESC' }
    });

    const { currentAssignedUserId, ...restItem } = item;
    const sanitizedItem = {
      ...restItem,
      currentAssignedUser: item.currentAssignedUser ? this.sanitizeUser(item.currentAssignedUser) : null,
    };

    const sanitizedEvents = events.map(ev => {
      const { fromUserId, toUserId, performedByUserId, ...restEv } = ev;
      return {
        ...restEv,
        fromUser: ev.fromUser ? this.sanitizeUser(ev.fromUser) : null,
        toUser: ev.toUser ? this.sanitizeUser(ev.toUser) : null,
        performedByUser: ev.performedByUser ? this.sanitizeUser(ev.performedByUser) : null,
      };
    });

    return { item: sanitizedItem, events: sanitizedEvents };
  }

  async findOne(id: string): Promise<any> {
    const item = await this.itemsRepository.findOne({
      where: { id },
      relations: ['category', 'currentDepartment', 'currentAssignedUser', 'customValues'],
    });
    if (!item) return null;
    const { currentAssignedUserId, ...rest } = item;
    return {
      ...rest,
      currentAssignedUser: item.currentAssignedUser ? this.sanitizeUser(item.currentAssignedUser) : null,
    };
  }

  // Common list endpoint for CA, DA, WH, etc
  async findAll(companyId: string, query: { 
    page?: number; 
    limit?: number; 
    search?: string; 
    status?: ItemStatus;
    categoryId?: string;
    departmentId?: string;
    assigneeId?: string;
  }) {
    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.itemsRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.currentDepartment', 'department')
      .leftJoinAndSelect('item.currentAssignedUser', 'user')
      .where('item.companyId = :companyId', { companyId });

    if (query.status) qb.andWhere('item.status = :status', { status: query.status });
    if (query.categoryId) qb.andWhere('item.categoryId = :categoryId', { categoryId: query.categoryId });
    if (query.departmentId) qb.andWhere('item.currentDepartmentId = :departmentId', { departmentId: query.departmentId });
    if (query.assigneeId) qb.andWhere('item.currentAssignedUserId = :assigneeId', { assigneeId: query.assigneeId });

    if (query.search) {
      qb.andWhere('(item.barcode ILIKE :search OR item.name ILIKE :search OR item.serialNumber ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('item.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    
    const sanitized = items.map(item => {
      const { currentAssignedUserId, ...rest } = item;
      return {
        ...rest,
        currentAssignedUser: item.currentAssignedUser ? this.sanitizeUser(item.currentAssignedUser) : null,
      };
    });

    return paginate(sanitized, total, page, limit);
  }

  // --- CORE SYSTEM WORKFLOWS ---

  async distribute(itemId: string, dto: DistributeItemDto, userId: string, userCompanyId: string, role: UserRole) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      // Super Admin can distribute items from any company
      if (role !== UserRole.SUPER_ADMIN && item.companyId !== userCompanyId) {
        throw new ForbiddenException('Cannot access items outside your company');
      }

      if (item.status !== ItemStatus.WAREHOUSE && item.status !== ItemStatus.RETURNED_FROM_REPAIR) {
        throw new BadRequestException('Item is not in warehouse');
      }

      const prevStatus = item.status;
      const prevLoc = item.currentLocation;

      // Update Item
      item.status = ItemStatus.DISTRIBUTED;
      item.currentDepartmentId = dto.departmentId;
      item.currentLocation = 'In Transit to Department';
      await manager.save(Item, item);

      // Log Event
      const event = manager.create(ItemEvent, {
        itemId: item.id,
        eventType: ItemEventType.DISTRIBUTED_TO_DEPT,
        fromStatus: prevStatus,
        toStatus: ItemStatus.DISTRIBUTED,
        fromLocation: prevLoc,
        toLocation: item.currentLocation,
        toDepartmentId: dto.departmentId,
        performedByUserId: userId,
        notes: dto.notes,
      });
      await manager.save(ItemEvent, event);

      // Adjust Warehouse Stock
      const stock = await manager.findOne(WarehouseStock, { where: { categoryId: item.categoryId, companyId: item.companyId } });
      if (stock) {
        stock.availableQuantity = Math.max(0, stock.availableQuantity - 1);
        stock.distributedQuantity += 1;
        await manager.save(WarehouseStock, stock);
      }

      return item;
    });
  }

  async assign(itemId: string, dto: AssignItemDto, userId: string, departmentId: string, role: UserRole) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');
      
      // A DA can only assign items distributed to their own department. Super Admin bypasses this.
      if (role !== UserRole.SUPER_ADMIN && item.currentDepartmentId !== departmentId) {
        throw new ForbiddenException('Item is not in your department');
      }

      const prevStatus = item.status;
      const willLogAcknowledge = item.status === ItemStatus.DISTRIBUTED;

      // Update Item
      item.status = ItemStatus.ASSIGNED;
      item.currentAssignedUserId = dto.userId;
      item.currentLocation = 'With User';
      await manager.save(Item, item);

      // If this is the first time a Dept Admin touches a distributed item, log the implied acknowledgement.
      if (willLogAcknowledge) {
         const ackEvent = manager.create(ItemEvent, {
          itemId: item.id,
          eventType: ItemEventType.DEPT_ACKNOWLEDGED,
          fromStatus: prevStatus,
          toStatus: prevStatus,
          toDepartmentId: item.currentDepartmentId,
          performedByUserId: userId,
        });
        await manager.save(ItemEvent, ackEvent);
      }

      // Log Assignment Event
      const event = manager.create(ItemEvent, {
        itemId: item.id,
        eventType: ItemEventType.ASSIGNED_TO_USER,
        fromStatus: prevStatus,
        toStatus: ItemStatus.ASSIGNED,
        fromDepartmentId: item.currentDepartmentId,
        toUserId: dto.userId,
        performedByUserId: userId,
        notes: dto.notes,
      });
      await manager.save(ItemEvent, event);

      return item;
    });
  }

  async reportFault(itemId: string, dto: ReportFaultDto, userId: string, role: UserRole) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      // Staff can only report on their own items
      if (role === UserRole.STAFF && item.currentAssignedUserId !== userId) {
        throw new ForbiddenException('You can only report faults for items assigned to you');
      }

      const prevStatus = item.status;
      
      // We don't necessarily change status to IN_REPAIR just yet; usually that happens when repair request is approved.
      // But we can update the condition.
      item.condition = ItemCondition.DAMAGED;
      await manager.save(Item, item);

      // Log Event
      const event = manager.create(ItemEvent, {
        itemId: item.id,
        eventType: ItemEventType.FAULT_REPORTED,
        fromStatus: prevStatus,
        toStatus: prevStatus,
        fromDepartmentId: item.currentDepartmentId,
        fromUserId: item.currentAssignedUserId,
        performedByUserId: userId,
        notes: dto.faultDescription,
      });
      await manager.save(ItemEvent, event);

      return item;
    });
  }

  async acknowledge(itemId: string, userId: string, role: UserRole, departmentId: string) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      const prevStatus = item.status;
      let eventType: ItemEventType;

      // Super Admin and Company Admin can acknowledge anything for their company (or all companies for SA)
      if (role === UserRole.SUPER_ADMIN || role === UserRole.COMPANY_ADMIN) {
        eventType = item.currentAssignedUserId ? ItemEventType.USER_ACKNOWLEDGED : ItemEventType.DEPT_ACKNOWLEDGED;
      } else if (role === UserRole.DEPT_ADMIN) {
        if (item.currentDepartmentId !== departmentId) {
          throw new ForbiddenException('Item is not in your department');
        }
        eventType = ItemEventType.DEPT_ACKNOWLEDGED;
      } else if (role === UserRole.STAFF) {
        if (item.currentAssignedUserId !== userId) {
          throw new ForbiddenException('Item is not assigned to you');
        }
        eventType = ItemEventType.USER_ACKNOWLEDGED;
      } else {
        throw new ForbiddenException('Only Administrators, Department Admins and Staff can acknowledge receipt');
      }

      item.status = ItemStatus.ACKNOWLEDGED;
      await manager.save(Item, item);

      const event = manager.create(ItemEvent, {
        itemId: item.id,
        eventType,
        fromStatus: prevStatus,
        toStatus: ItemStatus.ACKNOWLEDGED,
        performedByUserId: userId,
        notes: 'Receipt acknowledged digitally',
      });
      await manager.save(ItemEvent, event);

      return item;
    });
  }

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
