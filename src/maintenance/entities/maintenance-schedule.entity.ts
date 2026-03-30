import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { Company } from '../../companies/entities/company.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { User } from '../../users/entities/user.entity';
import { MaintenanceFrequency } from '../../common/enums';
import { MaintenanceRecord } from './maintenance-record.entity';

@Entity('maintenance_schedules')
export class MaintenanceSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  itemId: string;

  @ManyToOne(() => Item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ length: 255 })
  scheduleName: string;

  @Column({
    type: 'enum',
    enum: MaintenanceFrequency,
  })
  frequency: MaintenanceFrequency;

  @Column({ type: 'int', nullable: true })
  customDaysInterval?: number;

  @Column({ type: 'date', nullable: true })
  lastMaintainedAt?: Date;

  @Column({ type: 'date' })
  nextDueDate: Date;

  @Column({ type: 'uuid', nullable: true })
  assignedVendorId?: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'assignedVendorId' })
  assignedVendor?: Vendor;

  @Column({ type: 'uuid', nullable: true })
  assignedUserId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assignedUserId' })
  assignedUser?: User;

  @Column({ default: 7 })
  reminderDaysBefore: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => MaintenanceRecord, (record: MaintenanceRecord) => record.schedule)
  records: MaintenanceRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
