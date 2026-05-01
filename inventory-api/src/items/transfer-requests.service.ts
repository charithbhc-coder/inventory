import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransferRequest, TransferRequestStatus, TransferTargetType } from './entities/transfer-request.entity';
import { ItemsService } from './items.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../common/enums';
import { Item } from './entities/item.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TransferRequestsService {
  constructor(
    @InjectRepository(TransferRequest)
    private readonly transferRequestRepo: Repository<TransferRequest>,
    @InjectRepository(Item)
    private readonly itemsRepo: Repository<Item>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly itemsService: ItemsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createRequest(userId: string, itemId: string, dto: any) {
    const item = await this.itemsRepo.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');

    const request = this.transferRequestRepo.create({
      itemId,
      requestedByUserId: userId,
      targetType: dto.targetType, // PERSON, DEPARTMENT, COMPANY
      newAssignedToName: dto.newAssignedToName,
      newAssignedToEmployeeId: dto.newAssignedToEmployeeId,
      newDepartmentId: dto.newDepartmentId,
      newCompanyId: dto.newCompanyId,
      reason: dto.reason || 'Transfer request',
      status: TransferRequestStatus.PENDING,
    });

    await this.transferRequestRepo.save(request);

    // Notify Super Admins
    const superAdmins = await this.usersRepo.find({ where: { role: 'SUPER_ADMIN' as any } });
    for (const admin of superAdmins) {
      await this.notificationsService.create({
        recipientUserId: admin.id,
        type: NotificationType.TRANSFER_REQUEST_SUBMITTED,
        title: 'Transfer Request Submitted',
        message: `A transfer request for ${item.name} has been submitted.`,
        entityType: 'TransferRequest',
        entityId: request.id,
        actionUrl: `/items/${item.id}`,
      });
    }

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
      throw new BadRequestException('Request is not pending');
    }

    request.status = TransferRequestStatus.APPROVED;
    request.reviewedByUserId = adminId;
    request.reviewNotes = notes || null;

    await this.transferRequestRepo.save(request);

    // Perform the transfer
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
        assignedToName: undefined, // Unassign from person
        assignedToEmployeeId: undefined,
        notes: request.reason,
      }, adminId);
    } else if (request.targetType === TransferTargetType.COMPANY && request.newCompanyId) {
      // Typically need a custom logic to transfer company, but AssignItem DTO might not support companyId.
      // We can update the item directly or through a new method.
      request.item.companyId = request.newCompanyId;
      request.item.assignedToName = null;
      request.item.assignedToEmployeeId = null;
      request.item.departmentId = null;
      await this.itemsRepo.save(request.item);
    }

    // Notify Requestor
    await this.notificationsService.create({
      recipientUserId: request.requestedByUserId,
      type: NotificationType.TRANSFER_REQUEST_APPROVED,
      title: 'Transfer Request Approved',
      message: `Your transfer request for ${request.item.name} has been approved.`,
      entityType: 'TransferRequest',
      entityId: request.id,
      actionUrl: `/items/${request.item.id}`,
    });

    return request;
  }

  async rejectRequest(id: string, adminId: string, notes: string) {
    const request = await this.transferRequestRepo.findOne({ where: { id }, relations: ['item'] });
    if (!request) throw new NotFoundException('Transfer request not found');
    
    request.status = TransferRequestStatus.REJECTED;
    request.reviewedByUserId = adminId;
    request.reviewNotes = notes;

    await this.transferRequestRepo.save(request);

    // Notify Requestor
    await this.notificationsService.create({
      recipientUserId: request.requestedByUserId,
      type: NotificationType.TRANSFER_REQUEST_REJECTED,
      title: 'Transfer Request Rejected',
      message: `Your transfer request for ${request.item.name} has been rejected.`,
      entityType: 'TransferRequest',
      entityId: request.id,
      actionUrl: `/items/${request.item.id}`,
    });

    return request;
  }
}
