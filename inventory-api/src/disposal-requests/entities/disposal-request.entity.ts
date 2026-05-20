import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { User } from '../../users/entities/user.entity';
import {
  DisposalCondition,
  DisposalFinalDecision,
  DisposalMethod,
  DisposalRequestStatus,
  DisposalReviewDecision,
} from '../../common/enums';

export interface DataSecurityChecklist {
  businessDataBacked: boolean;
  companyDataErased: boolean;
  storageFormatted: boolean;
  userAccountsRemoved: boolean;
  removedFromDomain: boolean;
  physicalDestructionDone: boolean;
}

@Index('UQ_disposal_requests_item_pending', ['itemId'], {
  unique: true,
  where: `"status" IN ('PENDING_L1', 'PENDING_L2')`,
})
@Entity('disposal_requests')
export class DisposalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ type: 'uuid' })
  companyId: string;

  // ── Step 1: Request ──────────────────────────────────────────────

  @Column({ type: 'uuid' })
  requestedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser: User;

  @CreateDateColumn()
  requestedAt: Date;

  @Column()
  disposalReason: string;

  @Column({ type: 'enum', enum: DisposalCondition })
  disposalCondition: DisposalCondition;

  @Column({ type: 'text' })
  technicalEvaluation: string;

  @Column({ type: 'enum', enum: DisposalMethod })
  proposedMethod: DisposalMethod;

  @Column({ type: 'simple-array', nullable: true })
  evidencePhotoUrls: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // ── Step 2: L1 Review ────────────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  l1ReviewedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'l1ReviewedByUserId' })
  l1ReviewedByUser: User | null;

  @Column({ type: 'timestamp', nullable: true })
  l1ReviewedAt: Date | null;

  @Column({ type: 'enum', enum: DisposalReviewDecision, nullable: true })
  l1Decision: DisposalReviewDecision | null;

  @Column({ type: 'text', nullable: true })
  l1Notes: string | null;

  // ── Step 3: L2 Final Approval ────────────────────────────────────

  @Column({ type: 'uuid', nullable: true })
  l2ApprovedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'l2ApprovedByUserId' })
  l2ApprovedByUser: User | null;

  @Column({ type: 'timestamp', nullable: true })
  l2ApprovedAt: Date | null;

  @Column({ type: 'enum', enum: DisposalFinalDecision, nullable: true })
  l2Decision: DisposalFinalDecision | null;

  @Column({ type: 'text', nullable: true })
  l2Notes: string | null;

  @Column({ default: false })
  l1Bypassed: boolean;

  @Column({ type: 'jsonb', nullable: true })
  dataSecurityChecklist: DataSecurityChecklist | null;

  // ── Status ───────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: DisposalRequestStatus,
    default: DisposalRequestStatus.PENDING_L1,
  })
  status: DisposalRequestStatus;

  @UpdateDateColumn()
  updatedAt: Date;
}
