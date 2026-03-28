import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';
import { RepairJob } from './repair-job.entity';
import { PurchaseRequest } from '../../procurement/entities/purchase-request.entity';
import { DisposalStatus, DisposalMethod, DisposalReason } from '../../common/enums';

@Entity('disposal_requests')
export class DisposalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  itemId: string;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  requestedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser: User;

  @Column({ type: 'enum', enum: DisposalReason })
  reason: DisposalReason;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  repairJobId?: string | null;

  @ManyToOne(() => RepairJob, { nullable: true })
  @JoinColumn({ name: 'repairJobId' })
  repairJob?: RepairJob | null;

  @Column({ type: 'enum', enum: DisposalStatus, default: DisposalStatus.PENDING })
  status: DisposalStatus;

  @Column({ nullable: true })
  approvedByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedByUserId' })
  approvedByUser?: User | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt?: Date | null;

  @Column({ type: 'enum', enum: DisposalMethod, nullable: true })
  disposalMethod?: DisposalMethod | null;

  @Column({ type: 'text', nullable: true })
  disposalNotes?: string | null;

  @Column({ nullable: true })
  replacementPrId?: string | null;

  @ManyToOne(() => PurchaseRequest, { nullable: true })
  @JoinColumn({ name: 'replacementPrId' })
  replacementPr?: PurchaseRequest | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
