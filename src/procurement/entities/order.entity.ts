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
import { Company } from '../../companies/entities/company.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from '../../common/enums';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  orderNumber: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ nullable: true })
  vendorId?: string | null;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor?: Vendor | null;

  @Column()
  placedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'placedByUserId' })
  placedByUser: User;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  totalEstimatedCost?: number | null;

  @Column({ type: 'date', nullable: true })
  expectedDeliveryDate?: Date | null;

  @Column({ type: 'date', nullable: true })
  actualDeliveryDate?: Date | null;

  @Column({ length: 255, nullable: true })
  vendorReference?: string | null;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @OneToMany(() => OrderItem, (item: OrderItem) => item.order, { cascade: true })
  orderItems: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
