import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

/**
 * Append-only audit log. Every write operation is recorded here.
 * Use PostgreSQL RLS in production to prevent application-level deletes.
 */
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ length: 255 })
  userEmail: string; // Denormalized — survives user deletion

  @Column({ length: 255 })
  action: string; // e.g. 'CREATE_ITEM', 'APPROVE_ORDER'

  @Column({ length: 100, nullable: true })
  entityType: string; // e.g. 'Item', 'User', 'Company'

  @Column({ nullable: true })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ length: 50, nullable: true })
  ipAddress: string;

  @Column({ length: 500, nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  companyId: string; // For scoping Company Admin queries

  @CreateDateColumn()
  createdAt: Date;
}
