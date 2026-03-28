import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RepairJob } from './repair-job.entity';
import { User } from '../../users/entities/user.entity';
import { RepairStatus } from '../../common/enums';

@Entity('repair_updates')
export class RepairUpdate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  repairJobId: string;

  @ManyToOne(() => RepairJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'repairJobId' })
  repairJob: RepairJob;

  @Column({ type: 'enum', enum: RepairStatus, nullable: true })
  fromStatus?: RepairStatus | null;

  @Column({ type: 'enum', enum: RepairStatus })
  toStatus: RepairStatus;

  @Column({ type: 'text' })
  updateNote: string;

  @Column({ length: 255, nullable: true })
  location?: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  photos: string[];

  @Column()
  updatedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'updatedByUserId' })
  updatedByUser: User;

  @CreateDateColumn()
  createdAt: Date;
}
