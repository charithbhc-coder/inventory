import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserRole } from '../../common/enums';
import { Company } from '../../companies/entities/company.entity';
import { Department } from '../../departments/entities/department.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 500 })
  passwordHash: string;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 50, nullable: true })
  phone: string;

  @Column({ length: 100, nullable: true })
  employeeId: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company | null;

  @Column({ nullable: true })
  departmentId?: string | null;

  @ManyToOne(() => Department, { nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department?: Department | null;

  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  passwordHistory: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  // MFA — designed now, activated in Phase 4
  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mfaSecret?: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  mfaBackupCodes: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  mfaMethod?: string | null; // 'TOTP' | 'SMS'

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string | null;

  // Password reset token
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiresAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual getter
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
