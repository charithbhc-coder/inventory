import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as XLSX from 'xlsx';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { Item } from '../items/entities/item.entity';
import { ItemCategory } from '../items/entities/item-category.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import { ItemEventType, ItemStatus, ItemCondition } from '../common/enums';

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Department) private deptRepository: Repository<Department>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Item) private itemRepository: Repository<Item>,
    @InjectRepository(ItemCategory) private categoryRepository: Repository<ItemCategory>,
    private dataSource: DataSource,
  ) {}

  async validateAndPreview(buffer: Buffer, type: 'departments' | 'users' | 'categories' | 'inventory', companyId: string) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const results: { valid: any[]; errors: any[]; total: number } = {
      valid: [],
      errors: [],
      total: data.length,
    };

    for (const [index, row] of data.entries()) {
      const error = await this.validateRow(row, type, companyId);
      if (error) {
        results.errors.push({ row: index + 2, data: row, error });
      } else {
        results.valid.push(row);
      }
    }

    return results;
  }

  private async validateRow(row: any, type: string, companyId: string): Promise<string | null> {
    if (type === 'departments') {
      if (!row.name || !row.code) return 'Name and Code are required';
    } else if (type === 'users') {
      if (!row.email || !row.role) return 'Email and Role are required';
    } else if (type === 'inventory') {
      if (!row.name || !row.category_code) return 'Name and Category Code are required';
    }
    return null;
  }

  async processImport(data: any[], type: 'departments' | 'users' | 'categories' | 'inventory', companyId: string, performedByUserId: string) {
    return this.dataSource.transaction(async (manager) => {
      if (type === 'inventory') {
        for (const row of data) {
          const category = await manager.findOne(ItemCategory, { where: { code: row.category_code, companyId } });
          const item = manager.create(Item, {
            name: row.name as string,
            serialNumber: row.serial_number as string,
            categoryId: category?.id,
            companyId,
            status: ItemStatus.WAREHOUSE,
            condition: ItemCondition.NEW,
            purchasePrice: row.purchase_price ? Number(row.purchase_price) : undefined,
            purchaseDate: row.purchase_date ? new Date(row.purchase_date) : undefined,
            notes: `Bulk imported: ${row.notes || ''}`,
          });
          const savedItem = await manager.save(Item, item);

          const event = manager.create(ItemEvent, {
            itemId: savedItem.id,
            eventType: ItemEventType.IMPORTED,
            toStatus: ItemStatus.WAREHOUSE,
            performedByUserId,
            notes: 'Bulk imported via Excel',
          });
          await manager.save(ItemEvent, event);
        }
      }
      // Add similar logic for other types if needed
      return { importedCount: data.length };
    });
  }
}
