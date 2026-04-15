import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // --- Core Identity ---
  @Column({ length: 255 })
  softwareName: string; // e.g. 'AWS Business Support', 'Norton 360'

  @Column({ length: 255 })
  vendor: string; // e.g. 'Amazon Web Services', 'NortonLifeLock'

  @Column({ type: 'varchar', length: 500, nullable: true })
  licenseKey: string | null; // Optional — some licenses have no visible key

  // --- Dates ---
  @Column({ type: 'date', nullable: true })
  purchaseDate: Date | null;

  @Column({ type: 'date' })
  expiryDate: Date;

  // --- Status ---
  @Column({
    type: 'enum',
    enum: LicenseStatus,
    default: LicenseStatus.ACTIVE,
  })
  status: LicenseStatus;

  // --- Contact / Ownership ---
  @Column({ type: 'varchar', length: 255, nullable: true })
  contactEmail: string | null; // Who to notify besides admins

  @Column({ type: 'varchar', length: 255, nullable: true })
  category: string | null; // e.g. 'Security', 'Cloud', 'Productivity'

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  // --- Notification Tracking ---
  @Column({ type: 'timestamp', nullable: true })
  lastNotifiedAt: Date | null; // When the last expiry notification was sent

  @Column({ type: 'int', nullable: true })
  lastNotifiedDays: number | null; // Which milestone was last notified (30, 7, 3, 0)

  // --- Metadata ---
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
