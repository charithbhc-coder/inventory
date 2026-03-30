import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { RepairJob } from './entities/repair-job.entity';
import { RepairUpdate } from './entities/repair-update.entity';
import { DisposalRequest } from './entities/disposal-request.entity';
import { CreateRepairJobDto, ApproveRepairJobDto, UpdateRepairStatusDto, CreateDisposalRequestDto, ProcessDisposalDto } from './dto/repairs.dto';
import { Item } from '../items/entities/item.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import { PurchaseRequest } from '../procurement/entities/purchase-request.entity';
import { ItemStatus, ItemEventType, RepairStatus, UserRole, DisposalStatus, PRStatus, Urgency } from '../common/enums';
import { format } from 'date-fns';
import { getPaginationOptions, paginate } from '../common/utils/pagination.util';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class RepairsService {
  constructor(
    @InjectRepository(RepairJob) private repairJobRepository: Repository<RepairJob>,
    @InjectRepository(DisposalRequest) private disposalRepository: Repository<DisposalRequest>,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  private async generateRepairNumber(companyId: string): Promise<string> {
    const year = format(new Date(), 'yyyy');
    const count = await this.repairJobRepository.count({ where: { companyId } });
    return `RPR-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async createRepairJob(dto: CreateRepairJobDto, userId: string, companyId: string, departmentId: string) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
      const item = await manager.findOne(Item, { where: { id: dto.itemId, companyId } });
      if (!item) throw new NotFoundException('Item not found');

      if (item.status === ItemStatus.IN_REPAIR) {
        throw new BadRequestException('Item is already in repair');
      }

      const jobNumber = await this.generateRepairNumber(companyId);

      const job = manager.create(RepairJob, {
        jobNumber,
        itemId: item.id,
        companyId,
        departmentId,
        reportedByUserId: userId,
        faultDescription: dto.faultDescription,
        faultPhotos: dto.faultPhotos || [],
        priority: dto.priority || Urgency.NORMAL,
        status: RepairStatus.SUBMITTED,
      });

      const savedJob = await manager.save(RepairJob, job);

      // Log the item event
      const event = manager.create(ItemEvent, {
        itemId: item.id,
        eventType: ItemEventType.REPAIR_REQUESTED,
        fromStatus: item.status,
        toStatus: item.status, // Item is fundamentally still ASSIGNED or DISTRIBUTED until physically picked up
        performedByUserId: userId,
        toLocation: item.currentLocation,
        notes: `Repair job ${jobNumber} raised: ${dto.faultDescription}`,
        referenceId: savedJob.id,
      });

      await manager.save(ItemEvent, event);

      return savedJob;
    });
  }

  async approveAndAssign(id: string, dto: ApproveRepairJobDto, userId: string, companyId: string) {
    const job = await this.repairJobRepository.findOne({ where: { id, companyId } });
    if (!job) throw new NotFoundException('Repair job not found');
    if (job.status !== RepairStatus.SUBMITTED) throw new BadRequestException('Repair job not in submitted state');

    job.assignedRepairHandlerId = dto.assignedRepairHandlerId;
    job.vendorId = dto.vendorId;
    job.estimatedRepairCost = dto.estimatedRepairCost;
    job.status = RepairStatus.HANDLER_ASSIGNED;
    job.approvedByUserId = userId;

    return this.repairJobRepository.save(job);
  }

  async updateJobStatus(id: string, dto: UpdateRepairStatusDto, userId: string, companyId: string) {
    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
       const job = await manager.findOne(RepairJob, { where: { id, companyId } });
       if (!job) throw new NotFoundException('Job not found');

       const oldStatus = job.status;
       job.status = dto.status;
       
       if (dto.actualRepairCost) job.actualRepairCost = dto.actualRepairCost;
       if (dto.outcome) job.outcome = dto.outcome;

       if (dto.status === RepairStatus.PICKED_UP) {
           job.pickupDate = new Date();
           await this.updateItemState(manager, job.itemId, userId, ItemStatus.IN_REPAIR, ItemEventType.PICKED_UP_FOR_REPAIR, job.id, dto.updateNote);
       } else if (dto.status === RepairStatus.REPAIRED) {
           await this.updateItemState(manager, job.itemId, userId, ItemStatus.IN_REPAIR, ItemEventType.REPAIR_COMPLETED, job.id, dto.updateNote);
       } else if (dto.status === RepairStatus.RETURNED) {
           job.actualReturnDate = new Date();
           await this.updateItemState(manager, job.itemId, userId, ItemStatus.RETURNED_FROM_REPAIR, ItemEventType.RETURNED_FROM_REPAIR, job.id, dto.updateNote);
       } else if (dto.status === RepairStatus.IRREPARABLE) {
           // Item stays IN_REPAIR or effectively broken until disposal workflow runs
       }

       const update = manager.create(RepairUpdate, {
         repairJobId: job.id,
         fromStatus: oldStatus,
         toStatus: job.status,
         updateNote: dto.updateNote,
         location: dto.location,
         photos: dto.photos || [],
         updatedByUserId: userId,
       });

       await manager.save(RepairUpdate, update);
       return manager.save(RepairJob, job);
    });
  }

  private async updateItemState(manager: QueryRunner['manager'], itemId: string, userId: string, newStatus: ItemStatus, eventType: ItemEventType, referenceId: string, notes?: string) {
     const item = await manager.findOne(Item, { where: { id: itemId } });
     if (!item) return;

     const event = manager.create(ItemEvent, {
       itemId: item.id,
       eventType,
       fromStatus: item.status,
       toStatus: newStatus,
       performedByUserId: userId,
       toLocation: item.currentLocation,
       referenceId,
       notes,
     });

     item.status = newStatus;
     await manager.save(Item, item);
     await manager.save(ItemEvent, event);
  }

  async getJobs(companyId: string | undefined, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPaginationOptions(query);
    const qb = this.repairJobRepository.createQueryBuilder('job')
      .leftJoinAndSelect('job.item', 'item');

    if (companyId) qb.where('job.companyId = :companyId', { companyId });

    qb.orderBy('job.createdAt', 'DESC').skip(skip).take(limit);
    const [jobs, total] = await qb.getManyAndCount();
    return paginate(jobs, total, page, limit);
  }

  async createDisposal(dto: CreateDisposalRequestDto, userId: string, companyId: string) {
     const disposal = this.disposalRepository.create({
       ...dto,
       companyId,
       requestedByUserId: userId,
       status: DisposalStatus.PENDING,
     });
     return this.disposalRepository.save(disposal);
  }

  async processDisposal(id: string, dto: ProcessDisposalDto, userId: string, companyId: string) {
     return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
        const disposal = await manager.findOne(DisposalRequest, { where: { id, companyId }, relations: ['item'] });
        if (!disposal) throw new NotFoundException('Disposal request not found');

        disposal.status = dto.action === 'APPROVED' ? DisposalStatus.DISPOSED : DisposalStatus.REJECTED;
        disposal.approvedByUserId = userId;
        disposal.approvedAt = new Date();
        disposal.disposalMethod = dto.disposalMethod;
        disposal.disposalNotes = dto.disposalNotes;

        if (dto.action === 'APPROVED') {
           // Mark item disposed
           await this.updateItemState(manager, disposal.itemId, userId, ItemStatus.DISPOSED, ItemEventType.DISPOSED, disposal.id, dto.disposalNotes);

           // Auto-create Replacement PR
           const count = await manager.count(PurchaseRequest, { where: { companyId } });
           const prNum = `PR-${format(new Date(), 'yyyy')}-${String(count + 1).padStart(4, '0')}`;
           
           const pr = manager.create(PurchaseRequest, {
              requestNumber: prNum,
              companyId,
              departmentId: disposal.item.currentDepartmentId || 'SYSTEM_UNKNOWN',
              requestedByUserId: userId, // Sys admin triggering replacement
              categoryId: disposal.item.categoryId,
              quantity: 1,
              justification: `Auto-replacement for disposed item ${disposal.item.barcode}`,
              urgency: Urgency.HIGH,
              status: PRStatus.SUBMITTED,
           });

           const savedPr = await manager.save(PurchaseRequest, pr);
           disposal.replacementPrId = savedPr.id;
           
           this.eventEmitter.emit('item.disposed', {
               itemId: disposal.item.id,
               barcode: disposal.item.barcode,
               userId: userId,
               companyId: companyId
           });
        }

        return manager.save(DisposalRequest, disposal);
     });
  }
}
