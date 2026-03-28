import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ItemStatus, ItemCondition } from '../../common/enums';
import { Company } from '../../companies/entities/company.entity';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { ItemCategory } from './item-category.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  barcode: string; // Format: ACME-LAP-20250615-0042

  @Column({ length: 255, nullable: true })
  serialNumber: string; // Manufacturer serial if available

  @Column({ length: 255 })
  name: string; // e.g. 'Dell Latitude 5540'

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column()
  categoryId: string;

  @ManyToOne(() => ItemCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ nullable: true })
  currentDepartmentId: string; // NULL = in warehouse

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'currentDepartmentId' })
  currentDepartment: Department;

  @Column({ nullable: true })
  currentAssignedUserId: string; // NULL = not assigned to anyone

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'currentAssignedUserId' })
  currentAssignedUser: User;

  @Column({ length: 255, nullable: true })
  currentLocation: string; // Free text: 'Warehouse Shelf A3', 'IT Dept - Floor 2'

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus.WAREHOUSE,
  })
  status: ItemStatus;

  @Column({
    type: 'enum',
    enum: ItemCondition,
    default: ItemCondition.NEW,
  })
  condition: ItemCondition;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  purchasePrice: number;

  @Column({ type: 'date', nullable: true })
  purchaseDate: Date;

  @Column({ type: 'date', nullable: true })
  warrantyExpiresAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  vendorId?: string | null;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor?: Vendor | null;

  @Column({ nullable: true })
  receivedByUserId: string; // Warehouse Admin who received it

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
