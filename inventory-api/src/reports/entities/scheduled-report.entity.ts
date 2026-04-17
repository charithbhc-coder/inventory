import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { User } from '../../users/entities/user.entity';

export enum ReportFrequency {
  ONCE = 'ONCE',
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

  @Column({ length: 100 })
  reportType: string; // 'assets' | 'summary' | 'department' | 'activity' | 'repair'

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  bodyMessage?: string | null;

  // Recipient: system user IDs (optional, legacy compat)
  @Column({ type: 'uuid', array: true, default: '{}' })
  recipientUserIds: string[];

  // Recipient: external or internal email addresses (primary)
  @Column({ type: 'text', array: true, default: '{}' })
  recipientEmails: string[];

  @Column({ type: 'enum', enum: ReportFrequency })
  frequency: ReportFrequency;

  @Column({ length: 10, default: '08:00' })
  timeOfDay: string; // "HH:MM" in 24h format

  @Column({ type: 'int', nullable: true })
  dayOfWeek?: number | null; // 0-6

  @Column({ type: 'int', nullable: true })
  dayOfMonth?: number | null; // 1-31

  @Column({ type: 'varchar', length: 10, nullable: true })
  specificDate?: string | null; // "YYYY-MM-DD"

  @Column({ type: 'jsonb', nullable: true })
  filters?: Record<string, any>;

  @Column({ type: 'enum', enum: FileFormat, default: FileFormat.BOTH })
  fileFormat: FileFormat;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSentAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company | null;

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
