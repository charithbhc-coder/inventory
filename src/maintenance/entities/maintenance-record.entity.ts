import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MaintenanceSchedule } from './maintenance-schedule.entity';
import { Item } from '../../items/entities/item.entity';
import { User } from '../../users/entities/user.entity';
import { MaintenanceOutcome } from '../../common/enums';

@Entity('maintenance_records')
export class MaintenanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  scheduleId: string;

  @ManyToOne(() => MaintenanceSchedule, (schedule) => schedule.records, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'scheduleId' })
  schedule: MaintenanceSchedule;

  @Column()
  itemId: string;

  @ManyToOne(() => Item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ length: 255 })
  performedBy: string;

  @Column({ type: 'date' })
  performedAt: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  cost?: number;

  @Column({
    type: 'enum',
    enum: MaintenanceOutcome,
  })
  outcome: MaintenanceOutcome;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'date', nullable: true })
  nextScheduledDate?: Date;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser?: User;

  @CreateDateColumn()
  createdAt: Date;
}
