import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';
import { Company } from '../../companies/entities/company.entity';
import { Department } from '../../departments/entities/department.entity';
import { User } from '../../users/entities/user.entity';
import { ItemCategory } from '../../items/entities/item-category.entity';
import { Item } from '../../items/entities/item.entity';
import { ItemEvent } from '../../items/entities/item-event.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { AuditLog } from '../../audit-logs/entities/audit-log.entity';
import { SystemSetting } from '../../settings/entities/system-setting.entity';
import { ScheduledReport, ReportFrequency, FileFormat } from '../../reports/entities/scheduled-report.entity';
import { ItemStatus, ItemCondition, ItemEventType, NotificationType } from '../../common/enums/index';
import { NotificationChannel } from '../../notifications/entities/notification.entity';

dotenv.config();

async function bootstrap() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'inventory_user',
    password: process.env.DB_PASSWORD || 'inventory_pass_2025',
    database: process.env.DB_NAME || 'inventory_db',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: true,
  });

  await dataSource.initialize();
  console.log('Database connected');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  console.log('Cleaning up existing data...');
  // Truncate all tables with CASCADE to handle foreign keys
  const tables = [
    'audit_logs',
    'item_events',
    'notifications',
    'scheduled_reports',
    'items',
    'item_categories',
    'departments',
    'users',
    'companies',
    'system_settings'
  ];
  for (const table of tables) {
    await queryRunner.query(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
  }
  console.log('Cleanup completed.');

  const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
  const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

  console.log('Seeding Companies...');
  const companyNames = ['TechCorp', 'InnoSoft', 'GlobalLogistics', 'ApexSolutions', 'EcoSystems', 'FutureDynamics', 'SmartWeb', 'BuildWise', 'SkyHigh', 'DeepMind-Inspired'];
  const companies: Company[] = [];
  for (const name of companyNames) {
    const company = dataSource.getRepository(Company).create({
      name,
      code: name.substring(0, 3).toUpperCase() + randomInt(10, 99),
      address: `${randomInt(1, 999)} Business St, Silicon Valley`,
      email: `info@${name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      phone: `+1-555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      isActive: true,
    });
    companies.push(await dataSource.getRepository(Company).save(company));
  }

  console.log('Seeding Departments...');
  const deptNames = ['IT', 'HR', 'Finance', 'Operations', 'Marketing'];
  const departments: Department[] = [];
  for (const company of companies) {
    for (const name of deptNames) {
      const dept = dataSource.getRepository(Department).create({
        name,
        code: name.substring(0, 3).toUpperCase(),
        companyId: company.id,
        location: `Floor ${randomInt(1, 10)}`,
        isActive: true,
      });
      departments.push(await dataSource.getRepository(Department).save(dept));
    }
  }

  console.log('Seeding Item Categories...');
  const catData = [
    { name: 'Workstations', code: 'PC' },
    { name: 'Components', code: 'COMP' },
    { name: 'Laptops', code: 'LAP' },
    { name: 'Monitors', code: 'MON' },
    { name: 'Printers', code: 'PRN' },
    { name: 'Furniture', code: 'FURN' },
    { name: 'Networking', code: 'NET' },
    { name: 'Servers', code: 'SVR' },
    { name: 'Mobile', code: 'MOB' },
    { name: 'Other', code: 'OTH' },
  ];
  const categories: ItemCategory[] = [];
  for (const data of catData) {
    const cat = dataSource.getRepository(ItemCategory).create({
      name: data.name,
      code: data.code,
      description: `Category for ${data.name}`,
      isActive: true,
    });
    categories.push(await dataSource.getRepository(ItemCategory).save(cat));
  }

  console.log('Seeding exactly 10 Users...');
  const passwordHash = await bcrypt.hash('Password@123', 12);
  const users: User[] = [];
  // One user per company to ensure 10 users total
  for (let i = 0; i < 10; i++) {
    const company = companies[i];
    const user = dataSource.getRepository(User).create({
      email: `admin@${company.name.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      passwordHash,
      firstName: `Admin`,
      lastName: `${company.name}`,
      role: 'ADMIN',
      companyId: company.id,
      isActive: true,
      mustChangePassword: false,
      permissions: [
        'MANAGE_COMPANIES', 'MANAGE_DEPARTMENTS', 'MANAGE_USERS', 
        'ADD_ITEMS', 'EDIT_ITEMS', 'DELETE_ITEMS', 'ASSIGN_ITEMS',
        'MANAGE_REPAIRS', 'MANAGE_DISPOSALS', 'VIEW_WAREHOUSE', 
        'MANAGE_CATEGORIES', 'VIEW_REPORTS', 'EXPORT_DATA', 
        'GENERATE_BARCODES', 'VIEW_AUDIT_LOGS'
      ],
    });
    users.push(await dataSource.getRepository(User).save(user));
  }

  console.log('Seeding Items (with Hierarchy)...');
  const items: Item[] = [];
  const parentCategory = categories.find(c => c.code === 'PC')!;
  const childCategory = categories.find(c => c.code === 'COMP')!;

  // Create 40 Parent PCs
  for (let i = 0; i < 40; i++) {
    const company = random(companies);
    const dept = random(departments.filter(d => d.companyId === company.id));
    const user = random(users.filter(u => u.companyId === company.id));

    const item = dataSource.getRepository(Item).create({
      name: `Workstation Desktop Pro ${i + 1}`,
      barcode: `${company.code}-PC-${Date.now().toString().slice(-6)}-${i.toString().padStart(4, '0')}`,
      serialNumber: `SN-PC-${randomInt(1000, 9999)}`,
      categoryId: parentCategory.id,
      companyId: company.id,
      departmentId: dept.id,
      assignedToName: `${user.firstName} ${user.lastName}`,
      status: ItemStatus.IN_USE,
      condition: ItemCondition.GOOD,
      isWorking: true,
      purchasePrice: randomInt(1200, 3000),
      purchaseDate: new Date(),
      addedByUserId: user.id,
    });
    const savedParent = await dataSource.getRepository(Item).save(item);
    items.push(savedParent);

    // Create 3-5 children for each PC
    const componentNames = ['RAM Stick 16GB', 'RTX 3080 GPU', '1TB NVMe SSD', 'Intel i9 CPU', 'Power Supply 750W'];
    const numChildren = randomInt(3, 5);
    for (let j = 0; j < numChildren; j++) {
      const child = dataSource.getRepository(Item).create({
        name: componentNames[j % componentNames.length],
        barcode: `${company.code}-COMP-${Date.now().toString().slice(-6)}-${i}-${j}`,
        categoryId: childCategory.id,
        companyId: company.id,
        parentItemId: savedParent.id, // THE HIERARCHY
        status: ItemStatus.IN_USE,
        condition: ItemCondition.NEW,
        isWorking: true,
        addedByUserId: user.id,
      });
      items.push(await dataSource.getRepository(Item).save(child));
    }
  }

  // Create ~50 other random items to reach ~250 total
  const otherItemNames = ['Dell Monitor 27"', 'Logitech Mouse', 'Mechanical Keyboard', 'Epson Printer'];
  for (let i = 0; i < 50; i++) {
    const company = random(companies);
    const category = random(categories.filter(c => c.code !== 'PC' && c.code !== 'COMP'));
    const user = random(users.filter(u => u.companyId === company.id));

    const item = dataSource.getRepository(Item).create({
      name: `${random(otherItemNames)} ${i}`,
      barcode: `${company.code}-${category.code}-${Date.now().toString().slice(-6)}-${i + 40}`,
      categoryId: category.id,
      companyId: company.id,
      status: ItemStatus.WAREHOUSE,
      condition: ItemCondition.NEW,
      isWorking: true,
      addedByUserId: user.id,
    });
    items.push(await dataSource.getRepository(Item).save(item));
  }

  console.log('Seeding Events, Notifications, and Logs...');
  // Add another 100 events
  for (let i = 0; i < 100; i++) {
    const item = random(items);
    const user = users[0];
    await dataSource.getRepository(ItemEvent).save({
      itemId: item.id,
      eventType: ItemEventType.ITEM_ADDED,
      toStatus: item.status,
      performedByUserId: user.id,
      notes: 'Initial seeding event.',
    });
  }

  // 100 Notifications
  for (let i = 0; i < 100; i++) {
    const user = random(users);
    await dataSource.getRepository(Notification).save({
      recipientUserId: user.id,
      companyId: user.companyId,
      type: NotificationType.ITEM_ADDED,
      title: 'System Alert',
      message: 'Dummy notification message.',
      deliveryChannel: NotificationChannel.IN_APP,
    });
  }

  // 100 Audit Logs
  for (let i = 0; i < 100; i++) {
    const user = random(users);
    await dataSource.getRepository(AuditLog).save({
      userId: user.id,
      userEmail: user.email,
      action: 'LOGIN',
      companyId: user.companyId,
    });
  }

  console.log('Seeding completed successfully!');
  await dataSource.destroy();
}

bootstrap().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
