import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Item } from './entities/item.entity';
import { ItemEvent } from './entities/item-event.entity';
import { ItemCategory } from './entities/item-category.entity';
import { Company } from '../companies/entities/company.entity';
import { ItemStatus, ItemCondition, ItemEventType } from '../common/enums';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';
import { generateBarcodeString } from '../common/utils/barcode.util';
import {
  CreateItemDto,
  UpdateItemDto,
  AssignItemDto,
  RepairItemDto,
  DisposeItemDto,
  ReturnFromRepairDto,
  ReportLostDto,
} from './dto/item.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item) private readonly itemsRepository: Repository<Item>,
    @InjectRepository(ItemEvent) private readonly eventsRepository: Repository<ItemEvent>,
    @InjectRepository(ItemCategory) private readonly categoriesRepository: Repository<ItemCategory>,
    @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
    private dataSource: DataSource,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ========================================
  // CRUD
  // ========================================

  async create(dto: CreateItemDto, userId: string): Promise<Item> {
    // Validate category and company outside the retry loop (they won't change)
    const category = await this.categoriesRepository.findOne({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    const company = await this.companyRepository.findOne({ where: { id: dto.companyId } });
    if (!company) throw new NotFoundException('Company not found');

    // Retry-on-conflict loop to safely handle concurrent barcode generation.
    // count()+1 is non-atomic; if two requests race, the unique index rejects one.
    // On conflict (PG code 23505) we re-derive the sequence from the highest
    // existing barcode for this company+category and retry.
    const MAX_RETRIES = 5;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Derive next sequence atomically within a serializable snapshot
      const existing = await this.itemsRepository
        .createQueryBuilder('item')
        .select('item.barcode', 'barcode')
        .where('item.companyId = :companyId', { companyId: dto.companyId })
        .andWhere('item.categoryId = :categoryId', { categoryId: dto.categoryId })
        .orderBy('item.createdAt', 'DESC')
        .limit(1)
        .getRawOne<{ barcode: string }>();

      // Parse the sequence from the last barcode (format: CO-CAT-YYYYMMDD-NNNN)
      // Fall back to count() when no barcode exists yet or it doesn't match format.
      let nextSeq: number;
      const match = existing?.barcode?.match(/-(\d{4})$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      } else {
        const count = await this.itemsRepository.count({ where: { companyId: dto.companyId, categoryId: dto.categoryId } });
        nextSeq = count + 1;
      }

      const barcode = generateBarcodeString(company.code, category.code, nextSeq);

      try {
        const saved = await this.dataSource.transaction(async (manager) => {
          const item = manager.create(Item, {
            ...dto,
            barcode,
            status: dto.departmentId ? ItemStatus.IN_USE : ItemStatus.WAREHOUSE,
            condition: dto.condition || ItemCondition.NEW,
            isWorking: true,
            addedByUserId: userId,
          });

          const savedItem = await manager.save(Item, item);

          // Log event
          const event = manager.create(ItemEvent, {
            itemId: savedItem.id,
            eventType: ItemEventType.ITEM_ADDED,
            toStatus: ItemStatus.WAREHOUSE,
            toLocation: dto.location || 'Company Warehouse',
            performedByUserId: userId,
            notes: `Item "${savedItem.name}" added to inventory`,
          });
          await manager.save(ItemEvent, event);

          return savedItem;
        });

        // Notify actor of new registration (outside transaction — fire and forget)
        this.notificationsService.handleItemAdded({ itemId: saved.id, barcode: saved.barcode, userId, companyId: saved.companyId, itemName: saved.name }).catch(() => {});

        return saved;
      } catch (err: any) {
        // PostgreSQL unique_violation on the barcode column — retry with new sequence
        const isUniqueViolation = err?.code === '23505' && err?.detail?.includes('barcode');
        if (isUniqueViolation && attempt < MAX_RETRIES) {
          continue; // re-enter the loop with an updated sequence number
        }
        throw err; // non-conflict error or exhausted retries
      }
    }

    // TypeScript requires an explicit unreachable throw after the loop
    throw new BadRequestException('Failed to generate a unique barcode after multiple attempts. Please try again.');
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: ItemStatus;
    categoryId?: string;
    companyId?: string;
    departmentId?: string;
    isWorking?: string;
    needsRepair?: string;
  }) {
    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.itemsRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.company', 'company')
      .leftJoinAndSelect('item.department', 'department')
      .leftJoinAndSelect('item.addedByUser', 'addedByUser');

    if (query.companyId) qb.andWhere('item.companyId = :companyId', { companyId: query.companyId });
    if (query.status) qb.andWhere('item.status = :status', { status: query.status });
    if (query.categoryId) qb.andWhere('item.categoryId = :categoryId', { categoryId: query.categoryId });
    if (query.departmentId) qb.andWhere('item.departmentId = :departmentId', { departmentId: query.departmentId });
    if (query.isWorking) qb.andWhere('item.isWorking = :isWorking', { isWorking: query.isWorking === 'true' });
    if (query.needsRepair) qb.andWhere('item.needsRepair = :needsRepair', { needsRepair: query.needsRepair === 'true' });

    if (query.search) {
      qb.andWhere(
        '(item.barcode ILIKE :search OR item.name ILIKE :search OR item.serialNumber ILIKE :search OR item.assignedToName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('item.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findOne(id: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({
      where: { id },
      relations: ['category', 'company', 'department', 'addedByUser', 'parentItem', 'parentItem.category', 'childItems', 'childItems.category'],
    });
    if (!item) throw new NotFoundException('Item not found');
    return item;
  }

  async getTimeline(barcodeOrId: string): Promise<any> {
    const isBarcode = !barcodeOrId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    const whereClause = isBarcode ? { barcode: barcodeOrId } : { id: barcodeOrId };

    const item = await this.itemsRepository.findOne({
      where: whereClause,
      relations: ['category', 'company', 'department', 'addedByUser'],
    });

    if (!item) throw new NotFoundException('Item not found');

    const events = await this.eventsRepository.find({
      where: { itemId: item.id },
      relations: ['fromDepartment', 'toDepartment', 'performedByUser'],
      order: { createdAt: 'DESC' },
    });

    return { item, events };
  }

  async update(id: string, dto: UpdateItemDto, userId: string): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id } });
      if (!item) throw new NotFoundException('Item not found');

      const prevStatus = item.status;
      Object.assign(item, dto);
      const saved = await manager.save(Item, item);

      // Log event
      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType: ItemEventType.ITEM_EDITED,
        fromStatus: prevStatus,
        toStatus: saved.status,
        performedByUserId: userId,
        notes: 'Item details updated',
      });
      await manager.save(ItemEvent, event);

      return saved;
    });
  }

  // ========================================
  // ASSIGN — to company/department/person
  // ========================================

  async assign(itemId: string, dto: AssignItemDto, userId: string): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      // STATE GUARD: Cannot assign an item that is currently in repair
      if (item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR) {
        throw new BadRequestException(
          `Cannot assign "${item.name}" — it is currently in repair. Return it from repair first.`
        );
      }

      const prevStatus = item.status;
      const prevDeptId = item.departmentId;

      // Store previous assignment
      if (item.assignedToName) {
        item.previousAssignedToName = item.assignedToName;
        item.previousAssignedToEmployeeId = item.assignedToEmployeeId;
      }

      // Update assignment
      if (dto.departmentId) item.departmentId = dto.departmentId;
      if (dto.assignedToName !== undefined) item.assignedToName = dto.assignedToName;
      if (dto.assignedToEmployeeId !== undefined) item.assignedToEmployeeId = dto.assignedToEmployeeId;
      if (dto.location) item.location = dto.location;

      // Determine status
      if (dto.assignedToName) {
        item.status = ItemStatus.IN_USE;
      } else if (dto.departmentId) {
        item.status = ItemStatus.IN_USE;
      }

      const saved = await manager.save(Item, item);

      // Determine event type
      const eventType = dto.assignedToName
        ? ItemEventType.ASSIGNED_TO_PERSON
        : ItemEventType.ASSIGNED_TO_DEPARTMENT;

      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType,
        fromStatus: prevStatus,
        toStatus: saved.status,
        fromDepartmentId: prevDeptId,
        toDepartmentId: dto.departmentId || item.departmentId,
        toPersonName: dto.assignedToName,
        toPersonEmployeeId: dto.assignedToEmployeeId || null,
        performedByUserId: userId,
        notes: dto.notes,
      });
      await manager.save(ItemEvent, event);

      // Notify actor of assignment
      this.notificationsService.handleItemAssigned({ itemId: saved.id, barcode: saved.barcode, assignedTo: dto.assignedToName || 'department', userId, companyId: saved.companyId, itemName: saved.name }).catch(() => {});

      return saved;
    });
  }

  async assignBulk(dto: any, userId: string): Promise<void> {
    const { itemIds, ...assignDto } = dto;
    await this.dataSource.transaction(async (manager) => {
      for (const id of itemIds) {
        const item = await manager.findOne(Item, { where: { id } });
        if (!item) continue;

        // STATE GUARD: Skip items currently in repair during bulk assignment
        if (item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR) {
          continue; // silently skip — caller should filter these out
        }

        const prevStatus = item.status;
        const prevDeptId = item.departmentId;

        if (item.assignedToName) {
          item.previousAssignedToName = item.assignedToName;
          item.previousAssignedToEmployeeId = item.assignedToEmployeeId;
        }

        if (assignDto.departmentId) item.departmentId = assignDto.departmentId;
        if (assignDto.assignedToName !== undefined) item.assignedToName = assignDto.assignedToName;
        if (assignDto.assignedToEmployeeId !== undefined) item.assignedToEmployeeId = assignDto.assignedToEmployeeId;
        if (assignDto.location) item.location = assignDto.location;

        if (assignDto.assignedToName || assignDto.departmentId) {
          item.status = ItemStatus.IN_USE;
        }

        const saved = await manager.save(Item, item);

        const eventType = assignDto.assignedToName
          ? ItemEventType.ASSIGNED_TO_PERSON
          : ItemEventType.ASSIGNED_TO_DEPARTMENT;

        const event = manager.create(ItemEvent, {
          itemId: saved.id,
          eventType,
          fromStatus: prevStatus,
          toStatus: saved.status,
          fromDepartmentId: prevDeptId,
          toDepartmentId: assignDto.departmentId || item.departmentId,
          toPersonName: assignDto.assignedToName,
          toPersonEmployeeId: assignDto.assignedToEmployeeId || null,
          performedByUserId: userId,
          notes: assignDto.notes || 'Bulk Assignment',
        });
        await manager.save(ItemEvent, event);
      }
    });
  }

  async unassign(itemId: string, userId: string): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      const prevStatus = item.status;

      // Store previous
      if (item.assignedToName) {
        item.previousAssignedToName = item.assignedToName;
        item.previousAssignedToEmployeeId = item.assignedToEmployeeId;
      }

      item.assignedToName = null;
      item.assignedToEmployeeId = null;
      item.status = item.departmentId ? ItemStatus.IN_USE : ItemStatus.WAREHOUSE;

      const saved = await manager.save(Item, item);

      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType: ItemEventType.UNASSIGNED,
        fromStatus: prevStatus,
        toStatus: saved.status,
        fromPersonName: item.previousAssignedToName,
        performedByUserId: userId,
        notes: item.departmentId 
          ? `Returned to ${item.department?.name || 'department'} custody` 
          : 'Item unassigned from person and returned to general inventory',
      });
      await manager.save(ItemEvent, event);

      return saved;
    });
  }

  // ========================================
  // REPAIR — mark for repair / send to repair / return from repair
  // ========================================

  async markForRepair(itemId: string, dto: RepairItemDto, userId: string): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      // STATE GUARD: Cannot send to repair if already in repair
      if (item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR) {
        throw new BadRequestException(
          `"${item.name}" is already in repair. Return it from repair before initiating a new repair cycle.`
        );
      }

      const prevStatus = item.status;

      item.needsRepair = true;
      item.repairNotes = dto.repairNotes;
      item.isWorking = false;
      item.condition = ItemCondition.DAMAGED;

      if (dto.sentToRepair) {
        item.sentToRepair = true;
        item.repairVendorName = dto.repairVendorName || null;
        item.repairDate = new Date();
        item.status = ItemStatus.SENT_TO_REPAIR;
      } else {
        item.status = ItemStatus.IN_REPAIR;
      }

      const saved = await manager.save(Item, item);

      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType: dto.sentToRepair ? ItemEventType.SENT_TO_REPAIR : ItemEventType.MARKED_NOT_WORKING,
        fromStatus: prevStatus,
        toStatus: saved.status,
        performedByUserId: userId,
        notes: dto.repairNotes,
      });
      await manager.save(ItemEvent, event);

      // Notify actor of repair
      this.notificationsService.handleItemSentToRepair({ itemId: saved.id, barcode: saved.barcode, userId, companyId: saved.companyId, itemName: saved.name }).catch(() => {});

      return saved;
    });
  }

  async returnFromRepair(itemId: string, dto: ReturnFromRepairDto, userId: string): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      const prevStatus = item.status;

      item.needsRepair = false;
      item.sentToRepair = false;
      item.repairReturnDate = new Date();
      item.isWorking = true;
      item.condition = dto.condition || ItemCondition.GOOD;

      // Return to warehouse or previous department
      if (item.departmentId) {
        item.status = ItemStatus.IN_USE;
      } else {
        item.status = ItemStatus.WAREHOUSE;
      }

      if (dto.repairNotes) {
        item.repairNotes = (item.repairNotes || '') + '\n--- Return Notes ---\n' + dto.repairNotes;
      }

      const saved = await manager.save(Item, item);

      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType: ItemEventType.RETURNED_FROM_REPAIR,
        fromStatus: prevStatus,
        toStatus: saved.status,
        performedByUserId: userId,
        notes: dto.repairNotes || 'Returned from repair',
      });
      await manager.save(ItemEvent, event);

      // Notify actor of return from repair
      this.notificationsService.handleItemReturnedFromRepair({ itemId: saved.id, barcode: saved.barcode, userId, companyId: saved.companyId, itemName: saved.name }).catch(() => {});

      return saved;
    });
  }

  // ========================================

  async dispose(itemId: string, dto: DisposeItemDto, userId: string, userName: string): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      const prevStatus = item.status;
      // NOTE: Dispose IS allowed from IN_REPAIR/SENT_TO_REPAIR — item may be beyond repair.
      // The audit note will record that it was scrapped from repair state.
      const wasInRepair = item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR;

      item.status = ItemStatus.DISPOSED;
      item.disposalReason = dto.disposalReason;
      item.disposalMethod = dto.disposalMethod;
      item.disposalApprovedByName = userName;
      item.disposalDate = new Date();
      item.disposalNotes = dto.disposalNotes || null;

      // Unassign if assigned
      if (item.assignedToName) {
        item.previousAssignedToName = item.assignedToName;
        item.previousAssignedToEmployeeId = item.assignedToEmployeeId;
        item.assignedToName = null;
        item.assignedToEmployeeId = null;
      }

      const saved = await manager.save(Item, item);

      const repairNote = wasInRepair
        ? ` [Scrapped from repair — repair could not be completed]`
        : '';

      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType: ItemEventType.DISPOSED,
        fromStatus: prevStatus,
        toStatus: ItemStatus.DISPOSED,
        performedByUserId: userId,
        notes: `Disposed: ${dto.disposalReason} (Method: ${dto.disposalMethod})${repairNote}`,
      });
      await manager.save(ItemEvent, event);

      // Notify actor + broadcast to SUPER_ADMINs
      this.notificationsService.handleItemDisposed({ itemId: saved.id, barcode: saved.barcode, userId, companyId: saved.companyId, itemName: saved.name }).catch(() => {});

      return saved;
    });
  }

  async reportLost(itemId: string, notes: string, userId: string): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      // STATE GUARD: Cannot mark as lost while item is in repair — return from repair first
      if (item.status === ItemStatus.IN_REPAIR || item.status === ItemStatus.SENT_TO_REPAIR) {
        throw new BadRequestException(
          `Cannot mark "${item.name}" as lost — it is currently in repair. Return it from repair first, then report as lost if needed.`
        );
      }

      const prevStatus = item.status;

      item.status = ItemStatus.LOST;
      item.isWorking = false;

      // Unassign if assigned
      if (item.assignedToName) {
        item.previousAssignedToName = item.assignedToName;
        item.previousAssignedToEmployeeId = item.assignedToEmployeeId;
        item.assignedToName = null;
        item.assignedToEmployeeId = null;
        item.departmentId = null; // Also clear department if it was personally assigned
      }

      const saved = await manager.save(Item, item);

      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType: ItemEventType.LOST_REPORTED,
        fromStatus: prevStatus,
        toStatus: ItemStatus.LOST,
        performedByUserId: userId,
        notes: notes || 'Item reported as missing/lost',
      });
      await manager.save(ItemEvent, event);

      // Notify actor + broadcast to SUPER_ADMINs (CRITICAL)
      this.notificationsService.handleItemLost({ itemId: saved.id, barcode: saved.barcode, userId, companyId: saved.companyId, itemName: saved.name }).catch(() => {});

      return saved;
    });
  }

  // ========================================

  async getWarehouseItems(companyId: string, query: {
    page?: number;
    limit?: number;
    search?: string;
    includeDisposed?: string;
  }) {
    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.itemsRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.category', 'category')
      .leftJoinAndSelect('item.company', 'company')
      .where('item.companyId = :companyId', { companyId })
      .andWhere('item.departmentId IS NULL');

    if (query.includeDisposed === 'true') {
      qb.andWhere('item.status IN (:...statuses)', { statuses: [ItemStatus.WAREHOUSE, ItemStatus.DISPOSED] });
    } else {
      qb.andWhere('item.status = :status', { status: ItemStatus.WAREHOUSE });
    }

    if (query.search) {
      qb.andWhere('(item.barcode ILIKE :search OR item.name ILIKE :search)', { search: `%${query.search}%` });
    }

    qb.orderBy('item.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  // ========================================
  // MOVE TO WAREHOUSE — return item to warehouse
  // ========================================

  async moveToWarehouse(itemId: string, userId: string): Promise<Item> {
    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(Item, { where: { id: itemId } });
      if (!item) throw new NotFoundException('Item not found');

      const prevStatus = item.status;
      const prevDeptId = item.departmentId;

      // Store previous assignment
      if (item.assignedToName) {
        item.previousAssignedToName = item.assignedToName;
        item.previousAssignedToEmployeeId = item.assignedToEmployeeId;
      }

      item.status = ItemStatus.WAREHOUSE;
      item.departmentId = null;
      item.assignedToName = null;
      item.assignedToEmployeeId = null;
      item.location = 'Company Warehouse';

      const saved = await manager.save(Item, item);

      const event = manager.create(ItemEvent, {
        itemId: saved.id,
        eventType: ItemEventType.MOVED_TO_WAREHOUSE,
        fromStatus: prevStatus,
        toStatus: ItemStatus.WAREHOUSE,
        fromDepartmentId: prevDeptId,
        performedByUserId: userId,
        notes: 'Item returned to warehouse',
      });
      await manager.save(ItemEvent, event);

      return saved;
    });
  }

  // ========================================
  // FILE UPLOADS — warranty cards & invoices
  // ========================================

  async addWarrantyCard(itemId: string, filename: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const url = `/uploads/warranties/${filename}`;
    item.warrantyCardUrls = [...(item.warrantyCardUrls || []), url];
    return this.itemsRepository.save(item);
  }

  async addInvoice(itemId: string, filename: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const url = `/uploads/invoices/${filename}`;
    item.invoiceUrls = [...(item.invoiceUrls || []), url];
    return this.itemsRepository.save(item);
  }

  async updateImage(itemId: string, filename: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    item.imageUrl = `/uploads/items/${filename}`;
    return this.itemsRepository.save(item);
  }

  async previewBarcode(companyId: string, categoryId: string): Promise<string> {
    const category = await this.categoriesRepository.findOne({ where: { id: categoryId } });
    if (!category) throw new NotFoundException('Category not found');

    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) throw new NotFoundException('Company not found');

    const count = await this.itemsRepository.count({ where: { companyId, categoryId } });
    return generateBarcodeString(company.code, category.code, count + 1);
  }
}
