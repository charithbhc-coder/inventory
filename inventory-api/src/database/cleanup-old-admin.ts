import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/entities/user.entity';

dotenv.config();

async function cleanup() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'inventory_user',
    password: process.env.DB_PASSWORD || 'inventory_pass_2025',
    database: process.env.DB_NAME || 'inventory_db',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  });

  await dataSource.initialize();
  console.log('Database connected');

  const usersRepo = dataSource.getRepository(User);
  const oldEmail = 'charith.ddm@gmail.com';
  
  const existing = await usersRepo.findOne({ where: { email: oldEmail } });
  if (existing) {
    await usersRepo.remove(existing);
    console.log(`Successfully removed old Super Admin: ${oldEmail}`);
  } else {
    console.log(`Old Super Admin ${oldEmail} not found.`);
  }

  await dataSource.destroy();
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
