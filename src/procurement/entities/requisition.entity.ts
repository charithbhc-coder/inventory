import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from '../../companies/entities/company.entity';
import { Department } from '../../departments/entities/department.entity';
import { ItemCategory } from '../../items/entities/item-category.entity';
import { PRItemStatus } from '../../common/enums/index';

export enum RequisitionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED_TO_PR = 'CONVERTED_TO_PR',
}

@Entity('requisitions')
export class Requisition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @Column({ type: 'text' })
  itemName: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => ItemCategory, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: ItemCategory | null;

  @Column({ type: 'text', nullable: true })
  justification?: string | null;

  @Column({
    type: 'enum',
    enum: RequisitionStatus,
    default: RequisitionStatus.PENDING,
  })
  status: RequisitionStatus;

  @Column({ type: 'uuid', nullable: true })
  purchaseRequestItemId?: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
