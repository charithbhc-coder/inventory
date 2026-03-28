import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

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

  @Column({ nullable: true })
  companyId: string; // NULL = global (set by Super Admin)

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ default: 12 })
  defaultWarrantyMonths: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
