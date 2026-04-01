import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PurchaseRequest } from './purchase-request.entity';
import { ItemCategory } from '../../items/entities/item-category.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { PRItemSource, PRItemStatus } from '../../common/enums';

@Entity('purchase_request_items')
export class PurchaseRequestItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  purchaseRequestId: string;

  @ManyToOne(() => PurchaseRequest, (pr) => pr.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaseRequestId' })
  purchaseRequest: PurchaseRequest;

  @Column({ length: 255 })
  requestedItemName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'uuid', nullable: true })
  categoryId?: string | null;

  @ManyToOne(() => ItemCategory, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: ItemCategory | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  estimatedUnitCost?: number | null;

  @Column({
    type: 'enum',
    enum: PRItemSource,
    nullable: true,
  })
  source?: PRItemSource | null;

  @Column({
    type: 'enum',
    enum: PRItemStatus,
    default: PRItemStatus.PENDING,
  })
  status: PRItemStatus;

  @Column({ type: 'uuid', nullable: true })
  vendorId?: string | null;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor?: Vendor | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
