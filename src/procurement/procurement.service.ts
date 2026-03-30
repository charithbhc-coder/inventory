import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ApprovalThreshold } from './entities/approval-threshold.entity';
import { CreatePurchaseRequestDto, CreateOrderDto, RejectPrDto, ReceiveOrderDto } from './dto/procurement.dto';
import { PRStatus, OrderStatus, UserRole } from '../common/enums';
import { format } from 'date-fns';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';
import { WarehouseService } from '../warehouse/warehouse.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ProcurementService {
  constructor(
    @InjectRepository(PurchaseRequest) private prRepository: Repository<PurchaseRequest>,
    @InjectRepository(Order) private orderRepository: Repository<Order>,
    @InjectRepository(ApprovalThreshold) private thresholdRepository: Repository<ApprovalThreshold>,
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

  async createPr(dto: CreatePurchaseRequestDto, userId: string, companyId: string, departmentId: string) {
    const requestNumber = await this.generatePrNumber(companyId);
    const pr = this.prRepository.create({
      ...dto,
      requestNumber,
      companyId,
      departmentId,
      requestedByUserId: userId,
      status: PRStatus.DRAFT,
    });
    return this.prRepository.save(pr);
  }

  async submitPr(id: string, companyId: string) {
    const pr = await this.prRepository.findOne({ where: { id, companyId } });
    if (!pr) throw new NotFoundException('PR not found');
    if (pr.status !== PRStatus.DRAFT) throw new BadRequestException('PR is not in DRAFT status');

    const thresholds = await this.getThresholds(companyId);
    const totalEst = (pr.estimatedUnitCost || 0) * pr.quantity;

    if (totalEst > 0 && totalEst < thresholds.autoApproveBelow) {
      pr.status = PRStatus.COMPANY_APPROVED; // Auto approve
    } else {
      pr.status = PRStatus.SUBMITTED;
    }

    return this.prRepository.save(pr);
  }

  async approvePr(id: string, userId: string, role: UserRole, companyId: string) {
    const pr = await this.prRepository.findOne({ where: { id, companyId } });
    if (!pr) throw new NotFoundException('PR not found');

    const thresholds = await this.getThresholds(companyId);
    const totalEst = (pr.estimatedUnitCost || 0) * pr.quantity;

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

  async rejectPr(id: string, dto: RejectPrDto, userId: string, role: UserRole, companyId: string) {
    const pr = await this.prRepository.findOne({ where: { id, companyId } });
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

  async createOrder(dto: CreateOrderDto, userId: string, companyId: string) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
      const orderNumber = await this.generateOrderNumber(companyId);
      
      let totalEst = 0;
      const orderItems: OrderItem[] = [];

      for (const item of dto.items) {
        if (item.purchaseRequestId) {
           const pr = await manager.findOne(PurchaseRequest, { where: { id: item.purchaseRequestId, companyId } });
           if (!pr) throw new NotFoundException(`PR ${item.purchaseRequestId} not found`);
           if (pr.status !== PRStatus.COMPANY_APPROVED && pr.status !== PRStatus.SUPER_APPROVED) {
              throw new BadRequestException(`PR ${pr.requestNumber} is not approved for ordering`);
           }
           pr.status = PRStatus.ORDERED;
           await manager.save(pr);
        }

        const cost = (item.unitCost || 0) * item.quantityOrdered;
        totalEst += cost;

        const oi = manager.create(OrderItem, {
          purchaseRequestId: item.purchaseRequestId,
          categoryId: item.categoryId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          totalCost: cost > 0 ? cost : null,
        });
        orderItems.push(oi);
      }

      const order = manager.create(Order, {
        orderNumber,
        companyId,
        vendorId: dto.vendorId,
        placedByUserId: userId,
        expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : null,
        totalEstimatedCost: totalEst > 0 ? totalEst : null,
        orderItems,
      });

      return manager.save(Order, order);
    });
  }

  async receiveOrderItems(orderId: string, dto: ReceiveOrderDto, userId: string, companyId: string) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
       const order = await manager.findOne(Order, { where: { id: orderId, companyId }, relations: ['orderItems'] });
       if (!order) throw new NotFoundException('Order not found');

       const orderItem = order.orderItems.find(oi => oi.categoryId === dto.categoryId);
       if (!orderItem) throw new BadRequestException('Category not found in this order');

       // Call WarehouseService to physically ingest the items and generate barcodes
       const response = await this.warehouseService.receiveItems(
         { categoryId: dto.categoryId, quantity: dto.quantityReceived, unitCost: dto.unitCost, name: dto.itemName }, 
         userId, 
         companyId
       );

       orderItem.quantityReceived += dto.quantityReceived;
       await manager.save(OrderItem, orderItem);

       // Determine if fully received
       const allReceived = order.orderItems.every(oi => oi.quantityReceived >= oi.quantityOrdered);
       order.status = allReceived ? OrderStatus.RECEIVED : OrderStatus.PARTIALLY_RECEIVED;
       await manager.save(Order, order);

       // Sync PR status if attached
       if (orderItem.purchaseRequestId) {
          const pr = await manager.findOne(PurchaseRequest, { where: { id: orderItem.purchaseRequestId } });
          if (pr) {
             pr.status = allReceived ? PRStatus.FULLY_RECEIVED : PRStatus.PARTIALLY_RECEIVED;
             await manager.save(PurchaseRequest, pr);
          }
       }

       return response;
    });
  }

  async getPrs(companyId: string | undefined, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.prRepository.createQueryBuilder('pr')
      .leftJoinAndSelect('pr.category', 'category')
      .leftJoinAndSelect('pr.requestedByUser', 'user');

    if (companyId) qb.where('pr.companyId = :companyId', { companyId });

    qb.orderBy('pr.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async getOrders(companyId: string | undefined, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.orderRepository.createQueryBuilder('ord')
      .leftJoinAndSelect('ord.vendor', 'vendor')
      .leftJoinAndSelect('ord.orderItems', 'items');

    if (companyId) qb.where('ord.companyId = :companyId', { companyId });

    qb.orderBy('ord.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }
}
