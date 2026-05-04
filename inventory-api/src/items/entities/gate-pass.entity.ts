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
  referenceNo: string; // e.g. "GP-4821"

  @Column()
  destination: string;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  authorizedBy: string;

  @Column({
    type: 'enum',
    enum: GatePassStatus,
    default: GatePassStatus.ACTIVE,
  })
  status: GatePassStatus;

  @OneToMany(() => Item, (item) => item.gatePass)
  items: Item[];

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
