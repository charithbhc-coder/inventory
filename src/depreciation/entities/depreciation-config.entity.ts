import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { ItemCategory } from '../../items/entities/item-category.entity';
import { Item } from '../../items/entities/item.entity';
import { DepreciationMethod } from '../../common/enums';

@Entity('depreciation_configs')
export class DepreciationConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ nullable: true })
  categoryId?: string;

  @ManyToOne(() => ItemCategory, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category?: ItemCategory;

  @Column({ nullable: true })
  itemId?: string;

  @ManyToOne(() => Item, { nullable: true })
  @JoinColumn({ name: 'itemId' })
  item?: Item;

  @Column({
    type: 'enum',
    enum: DepreciationMethod,
    default: DepreciationMethod.STRAIGHT_LINE,
  })
  method: DepreciationMethod;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  usefulLifeYears?: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, nullable: true })
  depreciationRate?: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  salvageValue: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
