import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { PurchaseRequestItem } from './entities/purchase-request-item.entity';
import { Requisition, RequisitionStatus } from './entities/requisition.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ApprovalThreshold } from './entities/approval-threshold.entity';
import { CreatePurchaseRequestDto, CreateOrderDto, RejectPrDto, ReceiveOrderDto, SourcePrItemDto, CreateRequisitionDto, ConvertRequisitionsDto } from './dto/procurement.dto';
import { PRStatus, OrderStatus, UserRole, PRItemStatus, Urgency } from '../common/enums';
import { format } from 'date-fns';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';
import { WarehouseService } from '../warehouse/warehouse.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(PurchaseRequest) private prRepository: Repository<PurchaseRequest>,
    @InjectRepository(PurchaseRequestItem) private prItemRepository: Repository<PurchaseRequestItem>,
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(ApprovalThreshold) private thresholdRepository: Repository<ApprovalThreshold>,
    @InjectRepository(Requisition) private requisitionRepository: Repository<Requisition>,
    private dataSource: DataSource,
    private warehouseService: WarehouseService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async generatePrNumber(companyId: string): Promise<string> {
    const year = format(new Date(), 'yyyy');
    const count = await this.prRepository.count({ where: { companyId } });
    return `PR-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  private async generateOrderNumber(companyId: string): Promise<string> {
    const year = format(new Date(), 'yyyy');
    const count = await this.orderRepository.count({ where: { companyId } });
    return `ORD-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async getThresholds(companyId: string) {
    let threshold = await this.thresholdRepository.findOne({ where: { companyId } });
    if (!threshold) {
      threshold = this.thresholdRepository.create({ companyId, superAdminApprovalRequiredAbove: 500, autoApproveBelow: 0 });
      await this.thresholdRepository.save(threshold);
    }
    return threshold;
  }

  async createPr(dto: CreatePurchaseRequestDto, userId: string, jwtCompanyId?: string, jwtDeptId?: string) {
    const companyId = dto.companyId || jwtCompanyId;
    const departmentId = dto.departmentId || jwtDeptId;

    if (!companyId) {
      throw new BadRequestException('Company ID is required to create a purchase request');
    }

    return this.dataSource.transaction(async (manager) => {
      const requestNumber = await this.generatePrNumber(companyId);
      
      const pr = manager.create(PurchaseRequest, {
        justification: dto.justification,
        urgency: dto.urgency,
        requestNumber,
        companyId,
        departmentId,
        requestedByUserId: userId,
        status: PRStatus.DRAFT,
      });

      const savedPr = await manager.save(PurchaseRequest, pr);

      const items = dto.items.map(item => manager.create(PurchaseRequestItem, {
        ...item,
        purchaseRequestId: savedPr.id,
        status: PRItemStatus.PENDING,
      }));

      await manager.save(PurchaseRequestItem, items);
      
      return manager.findOne(PurchaseRequest, { 
        where: { id: savedPr.id }, 
        relations: ['items'] 
      });
    });
  }

  async submitPr(id: string, companyId?: string) {
    const pr = await this.prRepository.findOne({ 
      where: companyId ? { id, companyId } : { id }, 
      relations: ['items'] 
    });
    if (!pr) throw new NotFoundException('PR not found');
    if (pr.status !== PRStatus.DRAFT) throw new BadRequestException('PR is not in DRAFT status');
    if (!pr.items || pr.items.length === 0) throw new BadRequestException('PR must have at least one item');

    // Always use PR's own companyId for threshold lookups
    const thresholds = await this.getThresholds(pr.companyId);
    
    // Sum total estimated cost from all line items
    const totalEst = pr.items.reduce((sum, item) => {
      return sum + (Number(item.estimatedUnitCost || 0) * item.quantity);
    }, 0);

    if (totalEst > 0 && totalEst < thresholds.autoApproveBelow) {
      pr.status = PRStatus.COMPANY_APPROVED; // Auto approve
    } else {
      pr.status = PRStatus.SUBMITTED;
    }

    return this.prRepository.save(pr);
  }

  async approvePr(id: string, userId: string, role: UserRole, companyId?: string) {
    const pr = await this.prRepository.findOne({ 
      where: companyId ? { id, companyId } : { id }, 
      relations: ['items'] 
    });
    if (!pr) throw new NotFoundException('PR not found');

    const thresholds = await this.getThresholds(pr.companyId);
    
    // Sum total from all line items
    const totalEst = pr.items.reduce((sum, item) => {
      return sum + (Number(item.estimatedUnitCost || 0) * item.quantity);
    }, 0);

    if (role === UserRole.COMPANY_ADMIN || role === UserRole.SUPER_ADMIN) {
      if (pr.status === PRStatus.SUBMITTED) {
        if (totalEst >= thresholds.superAdminApprovalRequiredAbove) {
          pr.status = PRStatus.SUPER_ADMIN_REQUIRED;
          pr.companyApprovedByUserId = userId;
          pr.companyApprovedAt = new Date();
        } else {
          pr.status = PRStatus.COMPANY_APPROVED;
          pr.companyApprovedByUserId = userId;
          pr.companyApprovedAt = new Date();
        }
      } else if (pr.status === PRStatus.SUPER_ADMIN_REQUIRED && role === UserRole.SUPER_ADMIN) {
        pr.status = PRStatus.SUPER_APPROVED;
        pr.superApprovedByUserId = userId;
        pr.superApprovedAt = new Date();
      } else {
        throw new BadRequestException(`Cannot approve PR in status ${pr.status} with role ${role}`);
      }
    } else {
      throw new ForbiddenException('You lack permissions to approve');
    }

    const saved = await this.prRepository.save(pr);
    
    if (saved.status === PRStatus.SUPER_APPROVED || saved.status === PRStatus.COMPANY_APPROVED) {
        this.eventEmitter.emit('purchase_request.approved', {
            prId: saved.id,
            requestNumber: saved.requestNumber,
            userId: saved.requestedByUserId,
            companyId: saved.companyId,
        });
    }

    return saved;
  }

  async sourceItem(prId: string, itemId: string, dto: SourcePrItemDto, companyId?: string) {
    const pr = await this.prRepository.findOne({ 
      where: companyId ? { id: prId, companyId } : { id: prId } 
    });
    if (!pr) throw new NotFoundException('PR not found');

    const item = await this.prItemRepository.findOne({ 
      where: { id: itemId, purchaseRequestId: prId } 
    });
    if (!item) throw new NotFoundException('PR implementation item not found');

    Object.assign(item, {
      ...dto,
      status: PRItemStatus.SOURCED,
    });

    return this.prItemRepository.save(item);
  }

  async rejectPr(id: string, dto: RejectPrDto, userId: string, role: UserRole, companyId?: string) {
    const pr = await this.prRepository.findOne({ 
      where: companyId ? { id, companyId } : { id } 
    });
    if (!pr) throw new NotFoundException('PR not found');
    if (pr.status === PRStatus.COMPANY_APPROVED || pr.status === PRStatus.SUPER_APPROVED || pr.status === PRStatus.CLOSED) {
       throw new BadRequestException('Cannot reject an already fully approved or closed PR');
    }

    pr.status = PRStatus.REJECTED;
    pr.rejectionReason = dto.rejectionReason;
    if (role === UserRole.COMPANY_ADMIN) pr.companyApprovedByUserId = userId;
    if (role === UserRole.SUPER_ADMIN) pr.superApprovedByUserId = userId;

    return this.prRepository.save(pr);
  }

  async createOrder(dto: CreateOrderDto, userId: string, companyId?: string) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
      // Determine company context (SA might not have one in JWT, so pick from first PR Item)
      let activeCompanyId = companyId;
      
      if (!activeCompanyId && dto.items.length > 0) {
        const firstItem = await manager.findOne(PurchaseRequestItem, { 
          where: { id: dto.items[0].purchaseRequestItemId },
          relations: ['purchaseRequest']
        });
        if (firstItem) activeCompanyId = firstItem.purchaseRequest.companyId;
      }

      if (!activeCompanyId) throw new BadRequestException('Company context could not be determined for the order');

      const orderNumber = await this.generateOrderNumber(activeCompanyId);
      
      let totalEst = 0;
      const orderItems: OrderItem[] = [];

      for (const item of dto.items) {
        if (item.purchaseRequestItemId) {
           const prItem = await manager.findOne(PurchaseRequestItem, { 
             where: { id: item.purchaseRequestItemId },
             relations: ['purchaseRequest']
           });
           
           if (!prItem) throw new NotFoundException(`PR Item ${item.purchaseRequestItemId} not found`);
           
           // If user is scoped to a company, ensure the item belongs to it
           if (companyId && prItem.purchaseRequest.companyId !== companyId) {
             throw new ForbiddenException('PR item belongs to another company');
           }
           
           const prStatus = prItem.purchaseRequest.status;
           if (prStatus !== PRStatus.COMPANY_APPROVED && prStatus !== PRStatus.SUPER_APPROVED) {
              throw new BadRequestException(`PR line item is not approved for ordering (Current PR status: ${prStatus})`);
           }

           prItem.status = PRItemStatus.ORDERED;
           await manager.save(PurchaseRequestItem, prItem);

           // Update master PR status to ORDERED if not already
           if (prItem.purchaseRequest.status !== PRStatus.ORDERED) {
              prItem.purchaseRequest.status = PRStatus.ORDERED;
              await manager.save(PurchaseRequest, prItem.purchaseRequest);
           }
        }

        const cost = (item.unitCost || 0) * item.quantityOrdered;
        totalEst += cost;

        const oi = manager.create(OrderItem, {
          purchaseRequestItemId: item.purchaseRequestItemId,
          categoryId: item.categoryId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          totalCost: cost > 0 ? cost : null,
        });
        orderItems.push(oi);
      }

      const order = manager.create(Order, {
        orderNumber,
        companyId: activeCompanyId,
        vendorId: dto.vendorId,
        placedByUserId: userId,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        totalEstimatedCost: totalEst > 0 ? totalEst : null,
        orderItems,
      });

      return manager.save(Order, order);
    });
  }

  async receiveOrderItems(orderId: string, dto: ReceiveOrderDto, userId: string, companyId?: string) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
       const order = await manager.findOne(Order, { 
         where: companyId ? { id: orderId, companyId } : { id: orderId }, 
         relations: ['orderItems'] 
       });
       if (!order) throw new NotFoundException('Order not found');

       const activeCompanyId = companyId || order.companyId;

       const orderItem = order.orderItems.find(oi => oi.categoryId === dto.categoryId);
       if (!orderItem) throw new BadRequestException('Category not found in this order');

       // Call WarehouseService to physically ingest the items and generate barcodes
       const response = await this.warehouseService.receiveItems(
         { categoryId: dto.categoryId, quantity: dto.quantityReceived, unitCost: dto.unitCost, name: dto.itemName }, 
         userId, 
         activeCompanyId
       );

       orderItem.quantityReceived += dto.quantityReceived;
       await manager.save(OrderItem, orderItem);

       // Determine if fully received
       const allReceived = order.orderItems.every(oi => oi.quantityReceived >= oi.quantityOrdered);
       order.status = allReceived ? OrderStatus.RECEIVED : OrderStatus.PARTIALLY_RECEIVED;
       await manager.save(Order, order);

       // Sync Line Item and PR status if attached
       if (orderItem.purchaseRequestItemId) {
          const prItem = await manager.findOne(PurchaseRequestItem, { 
            where: { id: orderItem.purchaseRequestItemId },
            relations: ['purchaseRequest', 'purchaseRequest.items']
          });

          if (prItem) {
             const isFullyRec = orderItem.quantityReceived >= orderItem.quantityOrdered;
             prItem.status = isFullyRec ? PRItemStatus.RECEIVED : PRItemStatus.ORDERED;
             await manager.save(PurchaseRequestItem, prItem);

             // Evaluate master PR status
             const allPrItemsRec = prItem.purchaseRequest.items.every(item => item.status === PRItemStatus.RECEIVED);
             prItem.purchaseRequest.status = allPrItemsRec ? PRStatus.FULLY_RECEIVED : PRStatus.PARTIALLY_RECEIVED;
             await manager.save(PurchaseRequest, prItem.purchaseRequest);
          }
       }

       return response;
    });
  }

  async getPrs(companyId: string | undefined, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.prRepository.createQueryBuilder('pr')
      .leftJoinAndSelect('pr.items', 'items')
      .leftJoinAndSelect('items.category', 'category')
      .leftJoinAndSelect('pr.requestedByUser', 'user');

    if (companyId) qb.where('pr.companyId = :companyId', { companyId });

    qb.orderBy('pr.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const sanitized = items.map(pr => {
      const { requestedByUserId, ...rest } = pr;
      return {
        ...rest,
        requestedByUser: pr.requestedByUser ? this.sanitizeUser(pr.requestedByUser) : null,
      };
    });

    return paginate(sanitized, total, page, limit);
  }

  async getOrders(companyId: string | undefined, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.orderRepository.createQueryBuilder('ord')
      .leftJoinAndSelect('ord.vendor', 'vendor')
      .leftJoinAndSelect('ord.orderItems', 'items')
      .leftJoinAndSelect('ord.placedByUser', 'user');

    if (companyId) qb.where('ord.companyId = :companyId', { companyId });

    qb.orderBy('ord.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    
    const sanitized = items.map(order => {
      const { placedByUserId, ...rest } = order;
      return {
        ...rest,
        placedByUser: order.placedByUser ? this.sanitizeUser(order.placedByUser) : null,
      };
    });

    return paginate(sanitized, total, page, limit);
  }

  async createRequisition(dto: CreateRequisitionDto, userId: string, companyId: string, departmentId: string) {
    const requisition = this.requisitionRepository.create({
      ...dto,
      requestedByUserId: userId,
      companyId,
      departmentId,
      status: RequisitionStatus.PENDING,
    });
    return this.requisitionRepository.save(requisition);
  }

  async getRequisitions(companyId: string | undefined, departmentId: string | undefined, userId: string | undefined, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.requisitionRepository.createQueryBuilder('req')
      .leftJoinAndSelect('req.requestedByUser', 'user')
      .leftJoinAndSelect('req.category', 'category');

    if (companyId) qb.andWhere('req.companyId = :companyId', { companyId });
    if (departmentId) qb.andWhere('req.departmentId = :departmentId', { departmentId });
    if (userId) qb.andWhere('req.requestedByUserId = :userId', { userId });

    qb.orderBy('req.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    
    const sanitized = items.map(req => {
      const { requestedByUserId, ...rest } = req;
      return {
        ...rest,
        requestedByUser: req.requestedByUser ? this.sanitizeUser(req.requestedByUser) : null,
      };
    });

    return paginate(sanitized, total, page, limit);
  }

  async convertToPr(dto: ConvertRequisitionsDto, userId: string, role: UserRole, companyId: string, departmentId: string) {
    return this.dataSource.transaction(async (manager) => {
      const requisitions = await manager.find(Requisition, {
        where: dto.requisitionIds.map(id => ({ id })),
        relations: ['category']
      });

      if (requisitions.length === 0) throw new BadRequestException('No requisitions found to convert');

      // Ensure all requisitions belong to the caller's department (unless Super Admin)
      if (role !== UserRole.SUPER_ADMIN) {
        for (const req of requisitions) {
          if (req.departmentId !== departmentId || req.companyId !== companyId) {
            throw new ForbiddenException(`Requisition ${req.id} does not belong to your department/company`);
          }
          if (req.status !== RequisitionStatus.PENDING) {
            throw new BadRequestException(`Requisition ${req.id} is already processed`);
          }
        }
      }

      const requestNumber = await this.generatePrNumber(companyId);
      const pr = manager.create(PurchaseRequest, {
        justification: dto.justification || `Consolidated from ${requisitions.length} requisitions`,
        urgency: dto.urgency || Urgency.NORMAL,
        requestNumber,
        companyId,
        departmentId,
        requestedByUserId: userId,
        status: PRStatus.DRAFT,
      });

      const savedPr = await manager.save(PurchaseRequest, pr);

      const prItems = requisitions.map(req => manager.create(PurchaseRequestItem, {
        purchaseRequestId: savedPr.id,
        requestedItemName: req.itemName,
        quantity: req.quantity,
        categoryId: req.categoryId,
        status: PRItemStatus.PENDING,
      }));

      await manager.save(PurchaseRequestItem, prItems);

      // Link back and mark as converted
      for (let i = 0; i < requisitions.length; i++) {
        requisitions[i].status = RequisitionStatus.CONVERTED_TO_PR;
        requisitions[i].purchaseRequestItemId = prItems[i].id;
        await manager.save(Requisition, requisitions[i]);
      }

      return manager.findOne(PurchaseRequest, { 
        where: { id: savedPr.id }, 
        relations: ['items'] 
      });
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
