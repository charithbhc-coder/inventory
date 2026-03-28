import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { ItemCategory } from '../../items/entities/item-category.entity';

/**
 * Tracks quantity of each item category in the warehouse.
 * Individual items are tracked in `items` table.
 * This table answers: "How many laptops are in the warehouse right now?"
 */
@Entity('warehouse_stock')
@Unique(['companyId', 'categoryId'])
export class WarehouseStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column()
  categoryId: string;

  @ManyToOne(() => ItemCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory;

  @Column({ default: 0 })
  totalQuantity: number; // Total ever received

  @Column({ default: 0 })
  availableQuantity: number; // Currently in warehouse

  @Column({ default: 0 })
  distributedQuantity: number; // Sent to departments

  @Column({ default: 0 })
  minimumThreshold: number; // Alert below this

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  averageUnitCost: number;

  @UpdateDateColumn()
  updatedAt: Date;
}
