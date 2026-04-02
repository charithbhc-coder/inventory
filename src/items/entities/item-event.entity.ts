import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ItemEventType, ItemStatus } from '../../common/enums';
import { Item } from './item.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';

/**
 * Immutable timeline of every event in an item's life.
 * Never delete or update rows. Only insert.
 * Powers the tracking timeline view.
 */
@Entity('item_events')
@Index(['itemId', 'createdAt'])
export class ItemEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  itemId: string;

  @ManyToOne(() => Item)
  @JoinColumn({ name: 'itemId' })
  item: Item;

  @Column({
    type: 'enum',
    enum: ItemEventType,
  })
  eventType: ItemEventType;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    nullable: true,
  })
  fromStatus: ItemStatus | null;

  @Column({
    type: 'enum',
    enum: ItemStatus,
  })
  toStatus: ItemStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fromLocation: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  toLocation: string | null;

  @Column({ type: 'uuid', nullable: true })
  fromDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'fromDepartmentId' })
  fromDepartment: Department;

  @Column({ type: 'uuid', nullable: true })
  toDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'toDepartmentId' })
  toDepartment: Department;

  // Text-based person tracking (not FK)
  @Column({ type: 'varchar', length: 255, nullable: true })
  fromPersonName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  toPersonName: string | null;

  @Column()
  performedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performedByUserId' })
  performedByUser: User;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
