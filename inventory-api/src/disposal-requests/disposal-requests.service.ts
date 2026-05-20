import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DisposalRequest } from './entities/disposal-request.entity';
import { Item } from '../items/entities/item.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import {
  CreateDisposalRequestDto,
  L1ReviewDto,
  L2ApproveDto,
} from './dto/disposal-request.dto';
import {
  DisposalFinalDecision,
  DisposalRequestStatus,
  DisposalReviewDecision,
  ItemEventType,
  ItemStatus,
} from '../common/enums';

@Injectable()
export class DisposalRequestsService {
  constructor(
    @InjectRepository(DisposalRequest)
    private readonly requestRepo: Repository<DisposalRequest>,
    @InjectRepository(Item)
    private readonly itemRepo: Repository<Item>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateDisposalRequestDto,
    userId: string,
  ): Promise<DisposalRequest> {
    const item = await this.itemRepo.findOne({ where: { id: dto.itemId } });
    if (!item) throw new NotFoundException('Item not found');

    if (item.status === ItemStatus.DISPOSED) {
      throw new BadRequestException(`"${item.name}" is already disposed.`);
    }

    const openRequest = await this.requestRepo.findOne({
      where: [
        { itemId: dto.itemId, status: DisposalRequestStatus.PENDING_L1 },
        { itemId: dto.itemId, status: DisposalRequestStatus.PENDING_L2 },
      ],
    });
    if (openRequest) {
      throw new BadRequestException(
        `A disposal request for "${item.name}" is already pending review.`,
      );
    }

    const request = this.requestRepo.create({
      ...dto,
      companyId: item.companyId,
      requestedByUserId: userId,
      status: DisposalRequestStatus.PENDING_L1,
      evidencePhotoUrls: dto.evidencePhotoUrls ?? null,
      notes: dto.notes ?? null,
    });
    const saved = await this.requestRepo.save(request);

    this.eventEmitter.emit('disposal.requested', {
      requestId: saved.id,
      itemId: item.id,
      itemName: item.name,
      barcode: item.barcode,
      companyId: item.companyId,
      requestedByUserId: userId,
    });

    return saved;
  }

  async l1Review(
    requestId: string,
    dto: L1ReviewDto,
    reviewerId: string,
    callerCompanyId?: string,
  ): Promise<DisposalRequest> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Disposal request not found');

    if (callerCompanyId && request.companyId !== callerCompanyId) {
      throw new ForbiddenException('Access denied.');
    }

    if (request.status !== DisposalRequestStatus.PENDING_L1) {
      throw new BadRequestException('This request is not awaiting L1 review.');
    }
    if (request.requestedByUserId === reviewerId) {
      throw new ForbiddenException('You cannot review your own disposal request.');
    }

    request.l1ReviewedByUserId = reviewerId;
    request.l1ReviewedAt = new Date();
    request.l1Decision = dto.decision;
    request.l1Notes = dto.notes ?? null;
    request.status =
      dto.decision === DisposalReviewDecision.RECOMMENDED
        ? DisposalRequestStatus.PENDING_L2
        : DisposalRequestStatus.REJECTED;

    const saved = await this.requestRepo.save(request);

    const eventName =
      dto.decision === DisposalReviewDecision.RECOMMENDED
        ? 'disposal.l1_recommended'
        : 'disposal.l1_rejected';

    this.eventEmitter.emit(eventName, {
      requestId: saved.id,
      itemId: saved.itemId,
      companyId: saved.companyId,
      requestedByUserId: saved.requestedByUserId,
      reviewerUserId: reviewerId,
    });

    return saved;
  }

  async l2Approve(
    requestId: string,
    dto: L2ApproveDto,
    approverId: string,
    approverName: string,
    callerCompanyId?: string,
  ): Promise<DisposalRequest> {
    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(DisposalRequest, {
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException('Disposal request not found');

      if (callerCompanyId && request.companyId !== callerCompanyId) {
        throw new ForbiddenException('Access denied.');
      }

      const validStatuses = [
        DisposalRequestStatus.PENDING_L1,
        DisposalRequestStatus.PENDING_L2,
      ];
      if (!validStatuses.includes(request.status)) {
        throw new BadRequestException(
          'This request is not awaiting final approval.',
        );
      }
      if (request.requestedByUserId === approverId) {
        throw new ForbiddenException(
          'You cannot approve your own disposal request.',
        );
      }
      if (request.l1ReviewedByUserId && request.l1ReviewedByUserId === approverId) {
        throw new ForbiddenException(
          'You cannot give final approval on a request you reviewed at the IT Manager stage.',
        );
      }

      const item = await manager.findOne(Item, { where: { id: request.itemId } });
      if (!item) throw new NotFoundException('Item not found');

      const wasL1Bypassed =
        request.status === DisposalRequestStatus.PENDING_L1;

      if (dto.decision === DisposalFinalDecision.APPROVED) {
        const checklist = dto.dataSecurityChecklist!;
        const allChecked = Object.values(checklist).every((v) => v === true);
        if (!allChecked) {
          throw new BadRequestException(
            'All data security checklist items must be confirmed before approving disposal.',
          );
        }

        const prevStatus = item.status;
        item.status = ItemStatus.DISPOSED;
        item.disposalReason = request.disposalReason;
        item.disposalMethod = request.proposedMethod;
        item.disposalApprovedByName = approverName;
        item.disposalDate = new Date();
        item.disposalNotes = request.notes ?? null;

        if (item.assignedToName) {
          item.previousAssignedToName = item.assignedToName;
          item.previousAssignedToEmployeeId = item.assignedToEmployeeId;
          item.assignedToName = null;
          item.assignedToEmployeeId = null;
        }
        await manager.save(Item, item);

        const bypassNote = wasL1Bypassed
          ? ' [L1 review bypassed — direct L2 approval]'
          : '';
        const event = manager.create(ItemEvent, {
          itemId: item.id,
          eventType: ItemEventType.DISPOSED,
          fromStatus: prevStatus,
          toStatus: ItemStatus.DISPOSED,
          performedByUserId: approverId,
          notes: `Disposed via protocol: ${request.disposalReason} (Method: ${request.proposedMethod})${bypassNote}`,
        });
        await manager.save(ItemEvent, event);
      }

      request.l2ApprovedByUserId = approverId;
      request.l2ApprovedAt = new Date();
      request.l2Decision = dto.decision;
      request.l2Notes = dto.notes ?? null;
      request.dataSecurityChecklist = dto.dataSecurityChecklist ?? null;
      request.l1Bypassed = wasL1Bypassed;
      request.status =
        dto.decision === DisposalFinalDecision.APPROVED
          ? DisposalRequestStatus.APPROVED
          : DisposalRequestStatus.REJECTED;

      const saved = await manager.save(DisposalRequest, request);

      const eventName =
        dto.decision === DisposalFinalDecision.APPROVED
          ? 'disposal.l2_approved'
          : 'disposal.l2_rejected';

      this.eventEmitter.emit(eventName, {
        requestId: saved.id,
        itemId: item.id,
        itemName: item.name,
        barcode: item.barcode,
        companyId: saved.companyId,
        requestedByUserId: saved.requestedByUserId,
        l1ReviewedByUserId: saved.l1ReviewedByUserId,
      });

      return saved;
    });
  }

  async cancel(requestId: string, userId: string, callerCompanyId?: string): Promise<DisposalRequest> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new NotFoundException('Disposal request not found');

    if (callerCompanyId && request.companyId !== callerCompanyId) {
      throw new ForbiddenException('Access denied.');
    }

    const cancellableStatuses = [
      DisposalRequestStatus.PENDING_L1,
      DisposalRequestStatus.PENDING_L2,
    ];
    if (!cancellableStatuses.includes(request.status)) {
      throw new BadRequestException('Only pending requests can be cancelled.');
    }
    if (request.requestedByUserId !== userId) {
      throw new ForbiddenException('You can only cancel your own disposal requests.');
    }

    request.status = DisposalRequestStatus.CANCELLED;
    return this.requestRepo.save(request);
  }

  async findAll(filters: {
    status?: DisposalRequestStatus;
    companyId?: string;
    itemId?: string;
  }): Promise<DisposalRequest[]> {
    const query = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.item', 'item')
      .leftJoinAndSelect('r.requestedByUser', 'requester')
      .leftJoinAndSelect('r.l1ReviewedByUser', 'l1Reviewer')
      .leftJoinAndSelect('r.l2ApprovedByUser', 'l2Approver')
      .orderBy('r.requestedAt', 'DESC');

    if (filters.status) {
      query.andWhere('r.status = :status', { status: filters.status });
    }
    if (filters.companyId) {
      query.andWhere('r.companyId = :companyId', { companyId: filters.companyId });
    }
    if (filters.itemId) {
      query.andWhere('r.itemId = :itemId', { itemId: filters.itemId });
    }

    return query.getMany();
  }

  async findOne(id: string, callerCompanyId?: string): Promise<DisposalRequest> {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['item', 'requestedByUser', 'l1ReviewedByUser', 'l2ApprovedByUser'],
    });
    if (!request) throw new NotFoundException('Disposal request not found');

    if (callerCompanyId && request.companyId !== callerCompanyId) {
      throw new ForbiddenException('Access denied.');
    }

    return request;
  }

  async checkItem(itemId: string, callerCompanyId?: string) {
    const qb = this.requestRepo
      .createQueryBuilder('r')
      .where('r.itemId = :itemId', { itemId })
      .andWhere('r.status IN (:...statuses)', {
        statuses: [DisposalRequestStatus.PENDING_L1, DisposalRequestStatus.PENDING_L2],
      });

    if (callerCompanyId) {
      qb.andWhere('r.companyId = :companyId', { companyId: callerCompanyId });
    }

    const request = await qb.getOne();
    return {
      hasOpen: !!request,
      requestId: request?.id ?? null,
      status: request?.status ?? null,
    };
  }
}
