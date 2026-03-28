import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { ItemCategory } from '../../items/entities/item-category.entity';
import { PRStatus, Urgency } from '../../common/enums';
import { Order } from './order.entity';

@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  requestNumber: string;

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
  requestedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser: User;

  @Column()
  categoryId: string;

  @ManyToOne(() => ItemCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'text' })
  justification: string;

  @Column({ type: 'enum', enum: Urgency, default: Urgency.NORMAL })
  urgency: Urgency;

  @Column({ type: 'enum', enum: PRStatus, default: PRStatus.DRAFT })
  status: PRStatus;

  @Column({ nullable: true })
  companyApprovedByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'companyApprovedByUserId' })
  companyApprovedByUser?: User | null;

  @Column({ type: 'timestamp', nullable: true })
  companyApprovedAt?: Date | null;

  @Column({ nullable: true })
  superApprovedByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'superApprovedByUserId' })
  superApprovedByUser?: User | null;

  @Column({ type: 'timestamp', nullable: true })
  superApprovedAt?: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedUnitCost?: number | null;

  @Column({ nullable: true })
  orderId?: string | null;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'orderId' })
  order?: Order | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
