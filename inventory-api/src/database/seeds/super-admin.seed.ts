import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
// Glob import for entities used below

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
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'inventory',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: true, // Let it sync schemas first time
  });

  await dataSource.initialize();
  console.log('Database connected');

  const usersRepo = dataSource.getRepository('User');

  const email = process.env.SUPER_ADMIN_EMAIL || 'KTMG-Vault@ktdoctor.com';
  const tempPass = process.env.SUPER_ADMIN_TEMP_PASS || 'Admin@123';
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
      role: 'SUPER_ADMIN', // using string 'SUPER_ADMIN' to avoid importing UserRole Enum
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
