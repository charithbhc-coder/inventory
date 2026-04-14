import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('item_categories')
export class ItemCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string; // e.g. 'Laptop', 'Office Chair', 'Printer'

  @Column({ length: 50, unique: true })
  code: string; // Used in barcode: 'LAP', 'CHR', 'PRN'

  @Column({ type: 'text', nullable: true })
  description: string;

  // --- Hierarchical (optional parent) ---
  @Column({ type: 'uuid', nullable: true })
  parentCategoryId: string | null;

  @ManyToOne(() => ItemCategory, (cat) => cat.children, { nullable: true })
  @JoinColumn({ name: 'parentCategoryId' })
  parent: ItemCategory | null;

  @OneToMany(() => ItemCategory, (cat) => cat.parent)
  children: ItemCategory[];

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
