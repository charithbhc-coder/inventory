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
import { TransferType, TransferStatus } from '../../common/enums';

@Entity('transfers')
export class Transfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  transferNumber: string;

  @Column()
  itemId: string;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ type: 'enum', enum: TransferType })
  transferType: TransferType;

  @Column()
  fromCompanyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'fromCompanyId' })
  fromCompany: Company;

  @Column({ type: 'uuid', nullable: true })
  fromDepartmentId?: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'fromDepartmentId' })
  fromDepartment?: Department | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fromLocation?: string | null;

  @Column()
  toCompanyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'toCompanyId' })
  toCompany: Company;

  @Column({ type: 'uuid', nullable: true })
  toDepartmentId?: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'toDepartmentId' })
  toDepartment?: Department | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  toLocation?: string | null;

  @Column()
  initiatedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'initiatedByUserId' })
  initiatedByUser: User;

  @Column({ type: 'uuid', nullable: true })
  currentHolderUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'currentHolderUserId' })
  currentHolderUser?: User | null;

  @Column({ type: 'enum', enum: TransferStatus, default: TransferStatus.INITIATED })
  status: TransferStatus;

  @Column({ type: 'text', nullable: true })
  handoffNotes?: string | null;

  @CreateDateColumn()
  initiatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  acknowledgedByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'acknowledgedByUserId' })
  acknowledgedByUser?: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
