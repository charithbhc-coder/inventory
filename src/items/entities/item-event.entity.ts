import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ItemEventType, ItemStatus } from '../../common/enums';
import { Item } from './item.entity';
import { User } from '../../users/entities/user.entity';
import { Department } from '../../departments/entities/department.entity';

/**
 * THE most important table — the immutable timeline of every event in an item's life.
 * Never delete or update rows. Only insert.
 * This powers the "AliExpress-style" tracking timeline.
 */
@Entity('item_events')
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
  fromStatus: ItemStatus;

  @Column({
    type: 'enum',
    enum: ItemStatus,
  })
  toStatus: ItemStatus;

  @Column({ length: 255, nullable: true })
  fromLocation: string;

  @Column({ length: 255, nullable: true })
  toLocation: string;

  @Column({ nullable: true })
  fromDepartmentId: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'fromDepartmentId' })
  fromDepartment: Department;

  @Column({ nullable: true })
  toDepartmentId: string;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'toDepartmentId' })
  toDepartment: Department;

  @Column({ nullable: true })
  fromUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;

  @Column({ nullable: true })
  toUserId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'toUserId' })
  toUser: User;

  @Column()
  performedByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performedByUserId' })
  performedByUser: User;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ nullable: true })
  referenceId: string; // Link to order_id, repair_job_id, etc.

  @CreateDateColumn()
  createdAt: Date;
}
