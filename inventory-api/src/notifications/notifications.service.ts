import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationChannel, NotificationPriority } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { MailService } from '../mail/mail.service';
import { OnEvent } from '@nestjs/event-emitter';
import { AdminPermission, NotificationType, UserRole } from '../common/enums';
import { User } from '../users/entities/user.entity';
import { SettingsService } from '../settings/settings.service';

interface CreateNotificationPayload {
  recipientUserId: string;
  companyId?: string;
  type: NotificationType;
  priority?: NotificationPriority;
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly gateway: NotificationsGateway,
    private readonly mailService: MailService,
    private readonly settingsService: SettingsService,
  ) {}

  async create(payload: CreateNotificationPayload) {
    const notification = this.notificationRepo.create({
      ...payload,
      priority: payload.priority || NotificationPriority.MEDIUM,
      deliveryChannel: NotificationChannel.BOTH,
    });

    const saved = await this.notificationRepo.save(notification);

    // Push real-time WebSocket notification to recipient's room
    this.gateway.sendNotification(saved.recipientUserId, saved);

    // Auto-dispatch email notification
    this.userRepo.findOne({ where: { id: saved.recipientUserId }, select: ['id', 'email', 'isActive'] })
      .then(user => {
        if (user && user.email && user.isActive) {
          this.mailService.sendSystemNotificationEmail(
            user.email,
            saved.title,
            saved.message,
            saved.actionUrl
          ).catch(err => {
            this.logger.error(`Failed to send email notification to ${user.email}: ${err.message}`);
          });
        }
      })
      .catch(err => this.logger.error(`Failed to fetch user for email dispatch: ${err.message}`));

    return saved;
  }

  /** Broadcast to all SUPER_ADMINs and users with specific granular permissions */
  async broadcastToPrivilegedUsers(permission: AdminPermission, payload: Omit<CreateNotificationPayload, 'recipientUserId'>) {
    // 1. Get all Super Admins
    const superAdmins = await this.userRepo.find({
      where: { role: UserRole.SUPER_ADMIN, isActive: true },
      select: ['id'],
    });

    // 2. Get all other users who have this explicit permission
    // Using TypeORM's Raw for Postgres array containment operator
    const privilegedUsers = await this.userRepo
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.role != :superAdmin', { superAdmin: UserRole.SUPER_ADMIN })
      .andWhere(':permission = ANY(user.permissions)', { permission })
      .select(['user.id'])
      .getMany();

    const allRecipients = [...new Set([...superAdmins.map(u => u.id), ...privilegedUsers.map(u => u.id)])];

    await Promise.all(
      allRecipients.map((recipientId) =>
        this.create({ ...payload, recipientUserId: recipientId }),
      ),
    );
  }

  /** @deprecated Use broadcastToPrivilegedUsers with specific permission */
  async broadcastToSuperAdmins(payload: Omit<CreateNotificationPayload, 'recipientUserId'>) {
    return this.broadcastToPrivilegedUsers(AdminPermission.VIEW_AUDIT_LOGS, payload);
  }

  async getMyNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.notificationRepo.findAndCount({
      where: { recipientUserId: userId, isDismissed: false },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });
    return { data: items, meta: { total, page, limit } };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepo.count({
      where: { recipientUserId: userId, isRead: false, isDismissed: false },
    });
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

  async dismiss(id: string, userId: string) {
    await this.notificationRepo.update(
      { id, recipientUserId: userId },
      { isDismissed: true, isRead: true, readAt: new Date() },
    );
  }

  // --- Event Listeners ---

  @OnEvent('item.disposed')
  async handleItemDisposed(payload: { itemId: string; barcode: string; userId: string; companyId: string; itemName: string }) {
    const enabled = await this.settingsService.getSetting('notify_on_item_disposed', true);
    if (!enabled) return;

    // Notify the actor
    await this.create({
      recipientUserId: payload.userId,
      companyId: payload.companyId,
      type: NotificationType.ITEM_DISPOSED,
      priority: NotificationPriority.HIGH,
      title: 'Asset Disposed',
      message: `${payload.itemName} (${payload.barcode}) has been permanently disposed.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?barcode=${payload.barcode}`,
    });

    // Broadcast to relevant privileged users
    await this.broadcastToPrivilegedUsers(AdminPermission.DELETE_ITEMS, {
      companyId: payload.companyId,
      type: NotificationType.ITEM_DISPOSED,
      priority: NotificationPriority.HIGH,
      title: '⚠️ Asset Disposed',
      message: `${payload.itemName} (${payload.barcode}) was disposed. Review audit log for details.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/logs`,
    });
  }

  @OnEvent('item.lost')
  async handleItemLost(payload: { itemId: string; barcode: string; userId: string; companyId: string; itemName: string }) {
    const enabled = await this.settingsService.getSetting('notify_on_item_lost', true);
    if (!enabled) return;

    // Notify the actor
    await this.create({
      recipientUserId: payload.userId,
      companyId: payload.companyId,
      type: NotificationType.ITEM_LOST,
      priority: NotificationPriority.HIGH,
      title: 'Asset Reported Missing',
      message: `${payload.itemName} (${payload.barcode}) has been marked as LOST and removed from active inventory.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?barcode=${payload.barcode}`,
    });

    // Broadcast to relevant privileged users
    await this.broadcastToPrivilegedUsers(AdminPermission.UPDATE_ITEMS, {
      companyId: payload.companyId,
      type: NotificationType.ITEM_LOST,
      priority: NotificationPriority.HIGH,
      title: '🔴 Asset Reported LOST',
      message: `${payload.itemName} (${payload.barcode}) has been reported missing. Immediate review recommended.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?barcode=${payload.barcode}`,
    });
  }

  @OnEvent('item.assigned')
  async handleItemAssigned(payload: { itemId: string; barcode: string; assignedTo: string; userId: string; companyId: string; itemName: string }) {
    const enabled = await this.settingsService.getSetting('notify_on_item_assigned', true);
    if (!enabled) return;

    await this.create({
      recipientUserId: payload.userId,
      companyId: payload.companyId,
      type: NotificationType.ITEM_ASSIGNED,
      priority: NotificationPriority.MEDIUM,
      title: 'Asset Assigned',
      message: `${payload.itemName} (${payload.barcode}) has been assigned to ${payload.assignedTo}.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?barcode=${payload.barcode}`,
    });
  }

  @OnEvent('item.added')
  async handleItemAdded(payload: { itemId: string; barcode: string; userId: string; companyId: string; itemName: string }) {
    const enabled = await this.settingsService.getSetting('notify_on_item_added', true);
    if (!enabled) return;

    await this.create({
      recipientUserId: payload.userId,
      companyId: payload.companyId,
      type: NotificationType.ITEM_ADDED,
      priority: NotificationPriority.LOW,
      title: 'Asset Registered',
      message: `${payload.itemName} (${payload.barcode}) has been added to inventory.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?barcode=${payload.barcode}`,
    });
  }

  @OnEvent('item.sent_to_repair')
  async handleItemSentToRepair(payload: { itemId: string; barcode: string; userId: string; companyId: string; itemName: string }) {
    const enabled = await this.settingsService.getSetting('notify_on_repair', true);
    if (!enabled) return;

    await this.create({
      recipientUserId: payload.userId,
      companyId: payload.companyId,
      type: NotificationType.ITEM_SENT_TO_REPAIR,
      priority: NotificationPriority.MEDIUM,
      title: 'Asset Sent to Repair',
      message: `${payload.itemName} (${payload.barcode}) has been sent for repair.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?barcode=${payload.barcode}`,
    });
  }

  @OnEvent('item.returned_from_repair')
  async handleItemReturnedFromRepair(payload: { itemId: string; barcode: string; userId: string; companyId: string; itemName: string }) {
    const enabled = await this.settingsService.getSetting('notify_on_repair', true);
    if (!enabled) return;

    await this.create({
      recipientUserId: payload.userId,
      companyId: payload.companyId,
      type: NotificationType.ITEM_RETURNED_FROM_REPAIR,
      priority: NotificationPriority.MEDIUM,
      title: 'Asset Returned from Repair',
      message: `${payload.itemName} (${payload.barcode}) has been returned from repair and is back in service.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?barcode=${payload.barcode}`,
    });
  }

  @OnEvent('user.permissions_updated')
  async handlePermissionsUpdated(payload: { userId: string; granted: string[]; revoked: string[]; updaterId: string }) {
    const messages = [];
    if (payload.granted && payload.granted.length > 0) messages.push(`Granted: ${payload.granted.join(', ')}`);
    if (payload.revoked && payload.revoked.length > 0) messages.push(`Revoked: ${payload.revoked.join(', ')}`);

    if (messages.length === 0) return;

    await this.create({
      recipientUserId: payload.userId,
      type: NotificationType.ACCOUNT_PERMISSIONS_UPDATED,
      priority: NotificationPriority.HIGH,
      title: 'Security Access Updated',
      message: messages.join(' | '),
      entityType: 'User',
      entityId: payload.userId,
      actionUrl: '/profile',
    });
  }

  @OnEvent('user.role_updated')
  async handleRoleUpdated(payload: { userId: string; newRole: string; oldRole: string; updaterId: string }) {
    await this.create({
      recipientUserId: payload.userId,
      type: NotificationType.ACCOUNT_ROLE_UPDATED,
      priority: NotificationPriority.HIGH,
      title: 'Designation Updated',
      message: `Your system role has been formally updated from "${payload.oldRole}" to "${payload.newRole}".`,
      entityType: 'User',
      entityId: payload.userId,
      actionUrl: '/profile',
    });
  }

  @OnEvent('license.added')
  async handleLicenseAdded(payload: { licenseId: string; softwareName: string; userId?: string }) {
    const enabled = await this.settingsService.getSetting('notify_on_license_activity', true);
    if (!enabled) return;

    if (payload.userId) {
      await this.create({
        recipientUserId: payload.userId,
        type: NotificationType.LICENSE_ADDED,
        priority: NotificationPriority.LOW,
        title: 'License Registered',
        message: `${payload.softwareName} license has been added to the system.`,
        entityType: 'License',
        entityId: payload.licenseId,
        actionUrl: `/licenses`,
      });
    }

    await this.broadcastToPrivilegedUsers(AdminPermission.VIEW_LICENSES, {
      type: NotificationType.LICENSE_ADDED,
      priority: NotificationPriority.LOW,
      title: 'New License Registered',
      message: `${payload.softwareName} license has been added to the system.`,
      entityType: 'License',
      entityId: payload.licenseId,
      actionUrl: `/licenses`,
    });
  }

  @OnEvent('license.updated')
  async handleLicenseUpdated(payload: { licenseId: string; softwareName: string; userId?: string }) {
    const enabled = await this.settingsService.getSetting('notify_on_license_activity', true);
    if (!enabled) return;

    if (payload.userId) {
      await this.create({
        recipientUserId: payload.userId,
        type: NotificationType.LICENSE_UPDATED,
        priority: NotificationPriority.LOW,
        title: 'License Details Updated',
        message: `${payload.softwareName} license information was modified by you.`,
        entityType: 'License',
        entityId: payload.licenseId,
        actionUrl: `/licenses`,
      });
    }

    await this.broadcastToPrivilegedUsers(AdminPermission.VIEW_LICENSES, {
      type: NotificationType.LICENSE_UPDATED,
      priority: NotificationPriority.LOW,
      title: 'License Details Updated',
      message: `${payload.softwareName} license information was modified.`,
      entityType: 'License',
      entityId: payload.licenseId,
      actionUrl: `/licenses`,
    });
  }

  @OnEvent('license.expiring')
  async handleLicenseExpiring(payload: { licenseId: string; softwareName: string; daysRemaining: number }) {
    // Expirations are high priority and shouldn't be disabled by generic activity toggle
    await this.broadcastToPrivilegedUsers(AdminPermission.VIEW_LICENSES, {
      type: NotificationType.LICENSE_EXPIRING,
      priority: NotificationPriority.HIGH,
      title: 'Software License Expiring',
      message: `${payload.softwareName} license will expire in ${payload.daysRemaining} days!`,
      entityType: 'License',
      entityId: payload.licenseId,
      actionUrl: `/licenses`,
    });
  }

  @OnEvent('license.expired')
  async handleLicenseExpired(payload: { licenseId: string; softwareName: string; daysRemaining: number }) {
    await this.broadcastToPrivilegedUsers(AdminPermission.VIEW_LICENSES, {
      type: NotificationType.LICENSE_EXPIRED,
      priority: NotificationPriority.HIGH,
      title: '🚨 Software License Expired',
      message: `${payload.softwareName} license has officially expired.`,
      entityType: 'License',
      entityId: payload.licenseId,
      actionUrl: `/licenses`,
    });
  }

  @OnEvent('user.updated')
  async handleUserUpdated(payload: { userId: string; firstName?: string; lastName?: string; avatarUrl?: string }) {
    await this.broadcastToPrivilegedUsers(AdminPermission.VIEW_USERS, {
      type: NotificationType.USER_UPDATED,
      priority: NotificationPriority.LOW,
      title: 'Profile Synchronized',
      message: `${payload.firstName || 'A user'} updated their account details.`,
      entityType: 'User',
      entityId: payload.userId,
    });
  }

  @OnEvent('item.warranty_expiring')
  async handleItemWarrantyExpiring(payload: { itemId: string; barcode: string; itemName: string; companyId: string; daysRemaining: number }) {
    await this.broadcastToPrivilegedUsers(AdminPermission.VIEW_ITEMS, {
      companyId: payload.companyId,
      type: NotificationType.ITEM_WARRANTY_EXPIRING,
      priority: NotificationPriority.HIGH,
      title: 'Asset Warranty Expiring',
      message: `${payload.itemName} (${payload.barcode}) warranty will expire in ${payload.daysRemaining} days!`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?search=${payload.barcode}`,
    });
  }

  @OnEvent('item.warranty_expired')
  async handleItemWarrantyExpired(payload: { itemId: string; barcode: string; itemName: string; companyId: string; daysRemaining: number }) {
    await this.broadcastToPrivilegedUsers(AdminPermission.VIEW_ITEMS, {
      companyId: payload.companyId,
      type: NotificationType.ITEM_WARRANTY_EXPIRED,
      priority: NotificationPriority.HIGH,
      title: '🚨 Asset Warranty Expired',
      message: `${payload.itemName} (${payload.barcode}) warranty has officially expired.`,
      entityType: 'Item',
      entityId: payload.itemId,
      actionUrl: `/items?search=${payload.barcode}`,
    });
  }
}
