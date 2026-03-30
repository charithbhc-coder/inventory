import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Item } from './item.entity';
import { CategoryCustomField } from './category-custom-field.entity';
import { User } from '../../users/entities/user.entity';

@Entity('item_custom_values')
@Unique(['itemId', 'fieldId'])
export class ItemCustomValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  itemId: string;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column()
  fieldId: string;

  @ManyToOne(() => CategoryCustomField)
  @JoinColumn({ name: 'fieldId' })
  fieldDefinition: CategoryCustomField;

  @Column({ type: 'text', nullable: true })
  value?: string | null;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updatedByUserId' })
  updatedByUser?: User | null;
}
