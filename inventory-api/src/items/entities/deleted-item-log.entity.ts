import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Private record of permanently-deleted assets. Written by the permanent-delete
 * tool. NOT exposed through any controller or the Audit Logs page — readable
 * only directly via the database. Acts as a recovery breadcrumb if an asset is
 * deleted by mistake during the initial asset-entry cleanup.
 */
@Entity('deleted_item_logs')
@Index(['deletedByUserId', 'deletedAt'])
export class DeletedItemLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  itemId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  barcode: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  status: string | null;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  // Full JSON snapshot of the item row at deletion time.
  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, any> | null;

  @Column({ type: 'uuid' })
  deletedByUserId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deletedByEmail: string | null;

  @CreateDateColumn()
  deletedAt: Date;
}
