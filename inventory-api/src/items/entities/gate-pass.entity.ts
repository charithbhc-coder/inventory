import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Item } from './item.entity';
import { GatePassStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('gate_passes')
export class GatePass {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  referenceNo: string;

  @Column()
  companyId: string;

  @Column()
  destination: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  authorizedBy: string;

  @Column({
    type: 'enum',
    enum: GatePassStatus,
    default: GatePassStatus.PENDING_APPROVAL,
  })
  status: GatePassStatus;

  @Column({ type: 'uuid', nullable: true })
  approvedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approvedByUserId' })
  approvedByUser: User | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionNotes: string | null;

  @OneToMany(() => Item, (item) => item.gatePass)
  items: Item[];

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
