import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../common/enums';
import { Company } from '../../companies/entities/company.entity';
import { Department } from '../../departments/entities/department.entity';
import { ItemCategory } from '../../items/entities/item-category.entity';
import { Item } from '../../items/entities/item.entity';
import { ItemEvent } from '../../items/entities/item-event.entity';
import { WarehouseStock } from '../../warehouse/entities/warehouse-stock.entity';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';

dotenv.config();

/**
 * Run via: npm run seed
 * This strictly seeds the Super Admin using credentials from .env
 */
async function bootstrap() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'inventory_user',
    password: process.env.DB_PASSWORD || 'inventory_pass_2025',
    database: process.env.DB_NAME || 'inventory_db',
    entities: [User, Company, Department, ItemCategory, Item, ItemEvent, WarehouseStock, AuditLog],
    synchronize: true, // Let it sync schemas first time
  });

  await dataSource.initialize();
  console.log('Database connected');

  const usersRepo = dataSource.getRepository(User);

  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@inventory.com';
  const tempPass = process.env.SUPER_ADMIN_TEMP_PASS || 'TempAdmin@2025!';
  const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
  const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

  const existing = await usersRepo.findOne({ where: { email } });

  if (existing) {
    console.log(`Super admin ${email} already exists.`);
  } else {
    const passwordHash = await bcrypt.hash(tempPass, 12);
    const newAdmin = usersRepo.create({
      email,
      passwordHash,
      firstName,
      lastName,
      role: UserRole.SUPER_ADMIN,
      mustChangePassword: true, // As per requirements
      passwordHistory: [passwordHash],
    });

    await usersRepo.save(newAdmin);
    console.log(`Successfully seeded Super Admin: ${email}`);
    console.log(`Temporary Password: ${tempPass}`);
    console.log(`They will be required to change it on first login.`);
  }

  await dataSource.destroy();
}

bootstrap().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
