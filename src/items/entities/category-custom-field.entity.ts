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
import { ItemCategory } from './item-category.entity';

export enum CustomFieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
  DROPDOWN = 'DROPDOWN',
  URL = 'URL',
}

@Entity('category_custom_fields')
@Unique(['companyId', 'categoryId', 'fieldKey'])
export class CategoryCustomField {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company | null;

  @Column()
  categoryId: string;

  @ManyToOne(() => ItemCategory)
  @JoinColumn({ name: 'categoryId' })
  category: ItemCategory;

  @Column({ length: 100 })
  fieldName: string;

  @Column({ length: 100 })
  fieldKey: string; // e.g. 'ram_gb'

  @Column({ type: 'enum', enum: CustomFieldType, default: CustomFieldType.TEXT })
  fieldType: CustomFieldType;

  @Column({ type: 'text', array: true, nullable: true })
  dropdownOptions?: string[] | null;

  @Column({ default: false })
  isRequired: boolean;

  @Column({ default: 0 })
  displayOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ length: 255, nullable: true })
  placeholder?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
