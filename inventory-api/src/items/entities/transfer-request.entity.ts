import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Item } from './item.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';
import { Company } from '../../companies/entities/company.entity';

export enum TransferRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum TransferTargetType {
  PERSON = 'PERSON',
  DEPARTMENT = 'DEPARTMENT',
  COMPANY = 'COMPANY',
}

@Entity('transfer_requests')
export class TransferRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  itemId: string;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ type: 'enum', enum: TransferTargetType })
  targetType: TransferTargetType;

  // If PERSON
  @Column({ type: 'varchar', length: 255, nullable: true })
  newAssignedToName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  newAssignedToEmployeeId: string | null;

  // If DEPARTMENT or COMPANY
  @Column({ type: 'uuid', nullable: true })
  newDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'newDepartmentId' })
  newDepartment: Department;

  @Column({ type: 'uuid', nullable: true })
  newCompanyId: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'newCompanyId' })
  newCompany: Company;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid' })
  requestedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requestedByUserId' })
  requestedByUser: User;

  @Column({ type: 'enum', enum: TransferRequestStatus, default: TransferRequestStatus.PENDING })
  status: TransferRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedByUserId' })
  reviewedByUser: User;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
