import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { PurchaseRequest } from './purchase-request.entity';
import { ItemCategory } from '../../items/entities/item-category.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.orderItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })
  purchaseRequestId?: string | null;

  @ManyToOne(() => PurchaseRequest, { nullable: true })
  @JoinColumn({ name: 'purchaseRequestId' })
  purchaseRequest?: PurchaseRequest | null;

  @Column()
  categoryId: string;

  @ManyToOne(() => ItemCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory;

  @Column({ type: 'int' })
  quantityOrdered: number;

  @Column({ type: 'int', default: 0 })
  quantityReceived: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  unitCost?: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  totalCost?: number | null;
}
