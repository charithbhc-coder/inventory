import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ItemStatus, ItemCondition, DisposalMethod } from '../../common/enums';
import { Company } from '../../companies/entities/company.entity';
import { Department } from '../../departments/entities/department.entity';
import { ItemCategory } from './item-category.entity';
import { User } from '../../users/entities/user.entity';
import { GatePass } from './gate-pass.entity';

@Entity('items')
@Index(['companyId', 'status'])
@Index(['companyId', 'departmentId'])
@Index(['barcode'], { unique: true })
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Identity ---
  @Column({ length: 100, unique: true })
  barcode: string; // Auto-generated: ACME-LAP-20250615-0042

  @Column({ type: 'varchar', length: 255, nullable: true })
  serialNumber: string | null; // Manufacturer serial if available

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string | null; // Asset photo url

  @Column({ length: 255 })
  name: string; // e.g. 'Dell Latitude 5540'

  // --- Category (FK) ---
  @Column()
  categoryId: string;

  @ManyToOne(() => ItemCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory;

  // --- Location / Ownership ---
  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null; // NULL = in warehouse

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  // --- Assignment (TEXT, not FK — employees can leave) ---
  @Column({ type: 'varchar', length: 255, nullable: true })
  assignedToName: string | null; // e.g. "John Silva"

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignedToEmployeeId: string | null; // e.g. "EMP-0042"

  @Column({ type: 'varchar', length: 255, nullable: true })
  previousAssignedToName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  previousAssignedToEmployeeId: string | null;

  // --- Status & Condition ---
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

  @Column({ default: true })
  isWorking: boolean; // Quick flag: does it still work?

  // --- Repair Tracking (columns, not separate table) ---
  @Column({ default: false })
  needsRepair: boolean;

  @Column({ default: false })
  sentToRepair: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  repairVendorName: string | null; // Where it's sent for repair

  @Column({ type: 'text', nullable: true })
  repairNotes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  repairDate: Date | null; // When sent for repair

  @Column({ type: 'timestamp', nullable: true })
  repairReturnDate: Date | null; // When returned from repair

  // --- Purchase & Warranty ---
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  purchasePrice: string | number | null;

  @Column({ type: 'date', nullable: true })
  purchaseDate: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  purchasedFrom: string | null; // Vendor/shop name (simple text)

  @Column({ type: 'date', nullable: true })
  warrantyExpiresAt: Date | null;

  // Multiple warranty cards & invoices (arrays)
  @Column({ type: 'text', array: true, default: '{}' })
  warrantyCardUrls: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  invoiceUrls: string[];

  // --- Disposal (requires permission) ---
  @Column({ type: 'text', nullable: true })
  disposalReason: string | null;

  @Column({ type: 'enum', enum: DisposalMethod, nullable: true })
  disposalMethod: DisposalMethod | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  disposalApprovedByName: string | null; // Admin who approved

  @Column({ type: 'timestamp', nullable: true })
  disposalDate: Date | null;

  @Column({ type: 'text', nullable: true })
  disposalNotes: string | null;

  // --- Parent-Child Component Tracking ---
  // e.g., a RAM module can be "installed in" a Laptop
  @Column({ type: 'uuid', nullable: true })
  parentItemId: string | null;

  @ManyToOne(() => Item, (item) => item.childItems, { nullable: true })
  @JoinColumn({ name: 'parentItemId' })
  parentItem: Item | null;

  @OneToMany(() => Item, (item) => item.parentItem)
  childItems: Item[];

  // --- Gate Pass Tracking ---
  @Column({ type: 'uuid', nullable: true })
  gatePassId: string | null;

  @ManyToOne(() => GatePass, (gatePass) => gatePass.items, { nullable: true })
  @JoinColumn({ name: 'gatePassId' })
  gatePass: GatePass | null;

  // --- Metadata ---
  @Column({ type: 'text', nullable: true })
  remarks: string | null;

  @Column({ type: 'uuid', nullable: true })
  addedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'addedByUserId' })
  addedByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
