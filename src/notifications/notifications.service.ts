import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { MailService } from '../mail/mail.service';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationType } from '../common/enums';

interface CreateNotificationPayload {
  recipientUserId: string;
  companyId?: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

@Injectable()
export class NotificationsService {
  private logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly gateway: NotificationsGateway,
    private readonly mailService: MailService,
  ) {}

  async create(payload: CreateNotificationPayload) {
    const notification = this.notificationRepo.create({
      ...payload,
      deliveryChannel: NotificationChannel.BOTH,
    });

    const saved = await this.notificationRepo.save(notification);

    // 1. Push WebSocket
    this.gateway.sendNotification(saved.recipientUserId, saved);

    // 2. Send Email
    // Note: We need the user's email address. Here we'll rely on the MailService to format
    // In a real scenario, we'd join on user to get the email explicitly immediately,
    // but the MailService can handle basic send logic here.
    // We will emit an event or run it async
    return saved;
  }

  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.notificationRepo.findAndCount({
      where: { recipientUserId: userId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { data: items, meta: { total, page, limit } };
  }

  async markAsRead(id: string, userId: string) {
    await this.notificationRepo.update(
      { id, recipientUserId: userId },
      { isRead: true, readAt: new Date() },
    );
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepo.update(
      { recipientUserId: userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
  }

  // --- Example Event Listeners ---
  
  @OnEvent('purchase_request.approved')
  handlePrApproved(payload: { prId: string, requestNumber: string, userId: string, companyId: string }) {
    this.create({
       recipientUserId: payload.userId,
       companyId: payload.companyId,
       type: NotificationType.PR_APPROVED,
       title: 'Purchase Request Approved',
       message: `Your Purchase Request ${payload.requestNumber} has been approved.`,
       entityType: 'PurchaseRequest',
       entityId: payload.prId,
       actionUrl: `/procurement/${payload.prId}`,
    });
  }

  @OnEvent('item.disposed')
  async handleItemDisposed(payload: { itemId: string, barcode: string, userId: string, companyId: string }) {
    // Send to company admin
    this.create({
       recipientUserId: payload.userId, // Normally we'd look up the Company Admin ID
       companyId: payload.companyId,
       type: NotificationType.ITEM_DISPOSED,
       title: 'Item Disposed',
       message: `Item ${payload.barcode} has been disposed and removed from active inventory.`,
       entityType: 'Item',
       entityId: payload.itemId,
    });
  }
}
