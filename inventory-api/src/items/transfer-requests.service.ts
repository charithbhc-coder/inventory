import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferRequest, TransferRequestStatus, TransferTargetType } from './entities/transfer-request.entity';
import { ItemsService } from './items.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminPermission, NotificationType } from '../common/enums';
import { Item } from './entities/item.entity';

@Injectable()
export class TransferRequestsService {
  constructor(
    @InjectRepository(TransferRequest)
    private readonly transferRequestRepo: Repository<TransferRequest>,
    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,
    private readonly itemsService: ItemsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRequest(userId: string, itemId: string, dto: any) {
    const { request, itemName } = await this.itemsRepo.manager.transaction(async (em) => {
      const item = await em.findOne(Item, {
        where: { id: itemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item) throw new NotFoundException('Item not found');

      if (item.pendingTransferRequestId) {
        throw new ConflictException('This asset already has a pending transfer request');
      }

      const request = em.create(TransferRequest, {
        itemId,
        requestedByUserId: userId,
        targetType: dto.targetType,
        newAssignedToName: dto.newAssignedToName,
        newAssignedToEmployeeId: dto.newAssignedToEmployeeId,
        newDepartmentId: dto.newDepartmentId,
        newCompanyId: dto.newCompanyId,
        reason: dto.reason || 'Transfer request',
        status: TransferRequestStatus.PENDING,
      });

      await em.save(TransferRequest, request);

      item.pendingTransferRequestId = request.id;
      await em.save(Item, item);

      return { request, itemName: item.name };
    });

    // Notify outside transaction — notification failure must not affect the transaction
    this.notificationsService.broadcastToPrivilegedUsers(AdminPermission.APPROVE_TRANSFERS, {
      type: NotificationType.TRANSFER_REQUEST_SUBMITTED,
      title: 'Transfer Request Submitted',
      message: `A transfer request for ${itemName} has been submitted.`,
      entityType: 'TransferRequest',
      entityId: request.id,
      actionUrl: `/transfers`,
    }).catch(() => { /* notification failure should not fail the request */ });

    return request;
  }

  async getPendingRequests() {
    return this.transferRequestRepo.find({
      where: { status: TransferRequestStatus.PENDING },
      relations: ['item', 'requestedByUser', 'newDepartment', 'newCompany'],
      order: { createdAt: 'DESC' }
    });
  }

  async approveRequest(id: string, adminId: string, notes?: string) {
    const request = await this.transferRequestRepo.findOne({ where: { id }, relations: ['item'] });
    if (!request) throw new NotFoundException('Transfer request not found');
    if (request.status !== TransferRequestStatus.PENDING) {
      throw new ConflictException('This request has already been resolved');
    }

    // Atomically mark approved and unlock
    await this.transferRequestRepo.manager.transaction(async (em) => {
      request.status = TransferRequestStatus.APPROVED;
      request.reviewedByUserId = adminId;
      request.reviewNotes = notes || null;
      await em.save(TransferRequest, request);
      await em.update(Item, request.itemId, { pendingTransferRequestId: null });
    });

    // Perform the transfer (outside transaction — if this fails the admin can retry; request stays APPROVED, item stays unlocked)
    if (request.targetType === TransferTargetType.PERSON) {
      await this.itemsService.assign(request.itemId, {
        assignedToName: request.newAssignedToName || undefined,
        assignedToEmployeeId: request.newAssignedToEmployeeId || undefined,
        departmentId: request.item.departmentId || undefined,
        notes: request.reason,
      }, adminId);
    } else if (request.targetType === TransferTargetType.DEPARTMENT) {
      await this.itemsService.assign(request.itemId, {
        departmentId: request.newDepartmentId || undefined,
        assignedToName: undefined,
        assignedToEmployeeId: undefined,
        notes: request.reason,
      }, adminId);
    } else if (request.targetType === TransferTargetType.COMPANY && request.newCompanyId) {
      request.item.companyId = request.newCompanyId;
      request.item.assignedToName = null;
      request.item.assignedToEmployeeId = null;
      request.item.departmentId = null;
      request.item.pendingTransferRequestId = null;  // explicit — em.update() only did SQL, not in-memory
      await this.itemsRepo.save(request.item);
    }

    // Notify Requestor
    await this.notificationsService.create({
      recipientUserId: request.requestedByUserId,
      type: NotificationType.TRANSFER_REQUEST_APPROVED,
      title: 'Transfer Request Approved',
      message: `Your transfer request for ${request.item.name} has been approved and the asset has been reassigned.`,
      entityType: 'TransferRequest',
      entityId: request.id,
      actionUrl: `/items/${request.item.id}`,
    });

    return request;
  }

  async rejectRequest(id: string, adminId: string, notes: string) {
    const request = await this.transferRequestRepo.findOne({ where: { id }, relations: ['item'] });
    if (!request) throw new NotFoundException('Transfer request not found');
    if (request.status !== TransferRequestStatus.PENDING) {
      throw new ConflictException('This request has already been resolved');
    }

    // Atomically mark rejected and unlock
    await this.transferRequestRepo.manager.transaction(async (em) => {
      request.status = TransferRequestStatus.REJECTED;
      request.reviewedByUserId = adminId;
      request.reviewNotes = notes;
      await em.save(TransferRequest, request);
      await em.update(Item, request.itemId, { pendingTransferRequestId: null });
    });

    // Notify Requestor with resubmit metadata
    await this.notificationsService.create({
      recipientUserId: request.requestedByUserId,
      type: NotificationType.TRANSFER_REQUEST_REJECTED,
      title: 'Transfer Request Rejected',
      message: `Your transfer request for ${request.item.name} was rejected: ${notes}`,
      entityType: 'TransferRequest',
      entityId: request.id,
      actionUrl: `/employees`,
      metadata: {
        itemId: request.itemId,
        itemName: request.item.name,
        itemBarcode: request.item.barcode,
        targetType: request.targetType,
        newAssignedToName: request.newAssignedToName,
        newAssignedToEmployeeId: request.newAssignedToEmployeeId,
        reason: request.reason,
      },
    });

    return request;
  }

  async cancelRequest(itemId: string, userId: string) {
    const request = await this.transferRequestRepo.findOne({
      where: { itemId, status: TransferRequestStatus.PENDING },
    });
    if (!request) throw new NotFoundException('No pending transfer request found for this item');
    if (request.requestedByUserId !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    await this.transferRequestRepo.manager.transaction(async (em) => {
      request.status = TransferRequestStatus.CANCELLED;
      await em.save(TransferRequest, request);
      await em.update(Item, itemId, { pendingTransferRequestId: null });
    });

    return { success: true };
  }

  async getHistory(page = 1, limit = 20) {
    const [items, total] = await this.transferRequestRepo.findAndCount({
      where: [
        { status: TransferRequestStatus.APPROVED },
        { status: TransferRequestStatus.REJECTED },
        { status: TransferRequestStatus.CANCELLED },
      ],
      relations: ['item', 'requestedByUser', 'reviewedByUser'],
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }
}
