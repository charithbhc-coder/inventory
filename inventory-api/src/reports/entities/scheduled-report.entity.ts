import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

export enum ReportFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum FileFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  BOTH = 'BOTH',
}

@Entity('scheduled_reports')
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ length: 100 })
  reportType: string;

  @Column('uuid', { array: true })
  recipientUserIds: string[];

  @Column({ type: 'enum', enum: ReportFrequency })
  frequency: ReportFrequency;

  @Column({ type: 'int', nullable: true })
  dayOfWeek?: number | null; // 0-6

  @Column({ type: 'int', nullable: true })
  dayOfMonth?: number | null; // 1-31

  @Column({ type: 'jsonb', nullable: true })
  filters?: Record<string, any>;

  @Column({ type: 'enum', enum: FileFormat, default: FileFormat.BOTH })
  fileFormat: FileFormat;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSentAt?: Date | null;

  @Column()
  createdByUserId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
