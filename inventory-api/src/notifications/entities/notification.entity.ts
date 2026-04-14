import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NotificationType } from '../../common/enums';

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

export enum NotificationPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipientUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'recipientUserId' })
  recipientUser: User;

  @Column({ type: 'uuid', nullable: true })
  companyId?: string | null;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
  })
  priority: NotificationPriority;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityType?: string | null;

  @Column({ type: 'uuid', nullable: true })
  entityId?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  actionUrl?: string | null;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt?: Date | null;

  @Column({ default: false })
  isDismissed: boolean;

  @Column({ type: 'enum', enum: NotificationChannel, default: NotificationChannel.BOTH })
  deliveryChannel: NotificationChannel;

  @Column({ default: false })
  emailSent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  emailSentAt?: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
