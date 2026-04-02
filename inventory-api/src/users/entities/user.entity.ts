import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserRole, AdminPermission } from '../../common/enums';
import { Company } from '../../companies/entities/company.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 500 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string | null;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'companyId' })
  company?: Company | null;

  // Granular permissions — only used for ADMIN role
  // SUPER_ADMIN has all permissions implicitly
  @Column({ type: 'text', array: true, default: '{}' })
  permissions: string[];

  @Column({ default: true })
  mustChangePassword: boolean;

  @Column({ type: 'text', array: true, default: '{}' })
  passwordHistory: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  // MFA
  @Column({ default: false })
  mfaEnabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mfaSecret?: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  mfaBackupCodes: string[];

  @Column({ type: 'varchar', length: 50, nullable: true })
  mfaMethod?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string | null;

  // Password reset token
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiresAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual getter
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
