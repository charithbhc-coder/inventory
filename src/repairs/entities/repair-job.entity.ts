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
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { RepairStatus, Urgency, RepairOutcome } from '../../common/enums';

@Entity('repair_jobs')
export class RepairJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  jobNumber: string;

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
  departmentId: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  @Column()
  reportedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reportedByUserId' })
  reportedByUser: User;

  @Column({ nullable: true })
  assignedRepairHandlerId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedRepairHandlerId' })
  assignedRepairHandler?: User | null;

  @Column({ nullable: true })
  vendorId?: string | null;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor?: Vendor | null;

  @Column({ type: 'text' })
  faultDescription: string;

  @Column({ type: 'text', array: true, default: '{}' })
  faultPhotos: string[];

  @Column({ type: 'enum', enum: RepairStatus, default: RepairStatus.REPORTED })
  status: RepairStatus;

  @Column({ type: 'enum', enum: Urgency, default: Urgency.NORMAL })
  priority: Urgency;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedRepairCost?: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  actualRepairCost?: number | null;

  @Column({ type: 'text', nullable: true })
  diagnosisNotes?: string | null;

  @Column({ type: 'text', nullable: true })
  repairNotes?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  pickupDate?: Date | null;

  @Column({ type: 'date', nullable: true })
  estimatedReturnDate?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actualReturnDate?: Date | null;

  @Column({ type: 'enum', enum: RepairOutcome, nullable: true })
  outcome?: RepairOutcome | null;

  @Column({ nullable: true })
  approvedByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedByUserId' })
  approvedByUser?: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
