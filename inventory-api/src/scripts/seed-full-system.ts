import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { 
  UserRole, 
  ItemStatus, 
  ItemCondition, 
  ItemEventType, 
  DisposalMethod 
} from '../common/enums';

// Entities
import { Company } from '../companies/entities/company.entity';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { ItemCategory } from '../items/entities/item-category.entity';
import { Item } from '../items/entities/item.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';
import { SystemSetting } from '../settings/entities/system-setting.entity';

async function seed() {
  console.log('--- Starting Full System Seed ---');

  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: '1234',
    database: 'inventory_db',
    entities: [Company, Department, User, ItemCategory, Item, ItemEvent, AuditLog, SystemSetting],
    logging: false,
  });

  await dataSource.initialize();
  console.log('DB Connected.');

  const companyRepo = dataSource.getRepository(Company);
  const deptRepo = dataSource.getRepository(Department);
  const userRepo = dataSource.getRepository(User);
  const catRepo = dataSource.getRepository(ItemCategory);
  const itemRepo = dataSource.getRepository(Item);
  const eventRepo = dataSource.getRepository(ItemEvent);

  // 1. COMPANIES
  const companiesData = [
    { name: 'KTMG Holdings (HQ)', code: 'KTMG-HQ', email: 'hq@ktmg-vault.com', phone: '+1 555 0001', address: '123 Executive Blvd, New York' },
    { name: 'TechNova Solutions', code: 'TNS', email: 'admin@technova.io', phone: '+1 555 0002', address: 'Tech Plaza, San Francisco' },
    { name: 'GreenLeaf Logistics', code: 'GLL', email: 'ops@greenleaf.com', phone: '+1 555 0003', address: 'Green Industrial Park, Chicago' },
  ];
  
  const companies: Company[] = [];
  for (const cData of companiesData) {
    let comp = await companyRepo.findOne({ where: { name: cData.name } });
    if (!comp) {
        comp = await companyRepo.save(companyRepo.create(cData));
    }
    companies.push(comp);
  }
  console.log(`Ensured ${companies.length} companies exist.`);

  // 2. DEPARTMENTS
  const depts: Department[] = [];
  const deptNames = ['IT Support', 'Human Resources', 'Sales & Marketing', 'Engineering', 'Finance'];
  for (const comp of companies) {
    for (const name of deptNames) {
      let d = await deptRepo.findOne({ where: { name, companyId: comp.id } });
      if (!d) {
        d = await deptRepo.save(deptRepo.create({ name, code: name.substring(0, 3).toUpperCase(), companyId: comp.id }));
      }
      depts.push(d);
    }
  }
  console.log(`Ensured ${depts.length} departments exist.`);

  // 3. CATEGORIES
  const catsData = [
    { name: 'Laptops', code: 'LAP' },
    { name: 'Monitors', code: 'MON' },
    { name: 'Mobile Phones', code: 'MOB' },
    { name: 'Office Furniture', code: 'FUR' },
    { name: 'Network Gear', code: 'NET' },
    { name: 'Accessories', code: 'ACC' },
  ];
  const categories: ItemCategory[] = [];
  for (const cData of catsData) {
    let cat = await catRepo.findOne({ where: { code: cData.code } });
    if (!cat) {
        cat = await catRepo.save(catRepo.create(cData));
    }
    categories.push(cat);
  }
  console.log(`Ensured ${categories.length} categories exist.`);

  // 4. USERS
  const passHash = await bcrypt.hash('Admin@123', 12);
  const users: User[] = [];
  
  // HQ Admin
  const hqEmail = 'hq.admin@ktmg-vault.com';
  let hqAdmin = await userRepo.findOne({ where: { email: hqEmail } });
  if (!hqAdmin) {
    hqAdmin = await userRepo.save(userRepo.create({
        email: hqEmail,
        passwordHash: passHash,
        firstName: 'HQ',
        lastName: 'Administrator',
        role: UserRole.ADMIN,
        companyId: companies[0].id,
        permissions: ['MANAGE_USERS', 'MANAGE_COMPANIES', 'VIEW_REPORTS'],
        mustChangePassword: false
    }));
  }
  users.push(hqAdmin);

  // Staff Targets for assignments
  const staffNames = ['Alice Johnson', 'Bob Smith', 'Charlie Davis', 'Diana Prince', 'Evan Wright'];
  for (let i = 0; i < staffNames.length; i++) {
    const names = staffNames[i].split(' ');
    const email = `user${i}@demo.com`;
    let u = await userRepo.findOne({ where: { email } });
    if (!u) {
      u = await userRepo.save(userRepo.create({
        email,
        passwordHash: passHash,
        firstName: names[0],
        lastName: names[1],
        role: 'VIEWER',
        companyId: companies[i % companies.length].id,
        mustChangePassword: false
      }));
    }
    users.push(u);
  }
  console.log(`Created ${users.length} users.`);

  // 5. ITEMS (150+)
  console.log('Generating 180 items...');
  const items: Item[] = [];
  const laptopModels = ['MacBook Pro M3 14"', 'MacBook Air M2', 'Dell Latitude 5540', 'Lenovo ThinkPad X1 Carbon', 'HP EliteBook 840'];
  const monitorModels = ['Samsung Odyssey G7 27"', 'Dell UltraSharp 24"', 'LG Gram +view', 'Asus ProArt 27"'];
  const statuses = [ItemStatus.IN_USE, ItemStatus.WAREHOUSE, ItemStatus.IN_REPAIR, ItemStatus.SENT_TO_REPAIR, ItemStatus.LOST];

  for (let i = 1; i <= 180; i++) {
    const comp = companies[i % companies.length];
    const cat = categories[i % categories.length];
    const dept = depts.find(d => d.companyId === comp.id);
    
    let name = '';
    if (cat.name === 'Laptops') name = laptopModels[i % laptopModels.length];
    else if (cat.name === 'Monitors') name = monitorModels[i % monitorModels.length];
    else name = `${cat.name} Unit #${i}`;

    const statusIndex = Math.random();
    let status = ItemStatus.IN_USE;
    if (statusIndex > 0.85) status = ItemStatus.LOST;
    else if (statusIndex > 0.70) status = ItemStatus.IN_REPAIR;
    else if (statusIndex > 0.60) status = ItemStatus.WAREHOUSE;

    const assignedUser = status === ItemStatus.IN_USE ? users[i % users.length] : null;

    const item = itemRepo.create({
      barcode: `KTMG-${cat.code}-${20250000 + i}`,
      name,
      serialNumber: `SN-${uuidv4().substring(0, 13).toUpperCase()}`,
      categoryId: cat.id,
      companyId: comp.id,
      departmentId: assignedUser ? dept?.id : null,
      status,
      condition: i % 20 === 0 ? ItemCondition.DAMAGED : ItemCondition.GOOD,
      assignedToName: assignedUser ? assignedUser.fullName : null,
      assignedToEmployeeId: assignedUser ? `EMP-${1000 + i}` : null,
      purchasePrice: (Math.random() * 2000 + 400).toFixed(2),
      purchaseDate: new Date(Date.now() - Math.floor(Math.random() * 700 * 24 * 60 * 60 * 1000)),
      location: status === ItemStatus.WAREHOUSE ? 'Warehouse Shelf A-1' : 'Main Office Floor 2',
      notes: 'Automated seed data'
    });
    items.push(await itemRepo.save(item));
  }
  console.log(`Created ${items.length} items.`);

  // 6. EVENTS & HISTORY
  console.log('Simulating history...');
  for (let j = 0; j < 50; j++) {
    const randItem = items[Math.floor(Math.random() * items.length)];
    const ev = eventRepo.create({
      itemId: randItem.id,
      eventType: ItemEventType.CONDITION_UPDATED,
      fromStatus: randItem.status,
      toStatus: randItem.status,
      performedByUserId: users[0].id,
      notes: 'Condition check performed'
    });
    await eventRepo.save(ev);
  }

  console.log('--- SEED COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
