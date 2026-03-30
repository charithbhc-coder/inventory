import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Item } from '../../items/entities/item.entity';
import { DepreciationMethod } from '../../common/enums';

@Entity('item_depreciation_snapshots')
@Index(['itemId', 'snapshotDate'], { unique: true })
export class ItemDepreciationSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  itemId: string;

  @ManyToOne(() => Item, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({ type: 'date' })
  snapshotDate: Date; // e.g. First day of the month

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  purchasePrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  accumulatedDepreciation: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  bookValue: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  depreciationThisPeriod: number;

  @Column({
    type: 'enum',
    enum: DepreciationMethod,
  })
  methodUsed: DepreciationMethod;

  @CreateDateColumn()
  computedAt: Date;
}
