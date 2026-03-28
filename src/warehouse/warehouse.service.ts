import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { WarehouseStock } from './entities/warehouse-stock.entity';
import { Item } from '../items/entities/item.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import { Company } from '../companies/entities/company.entity';
import { ItemCategory } from '../items/entities/item-category.entity';
import { paginate, getPaginationOptions } from '../common/utils/pagination.util';
import { generateBarcodeString } from '../common/utils/barcode.util';
import { ReceiveItemsDto } from '../items/dto/item.dto';
import { ItemCondition, ItemStatus, ItemEventType } from '../common/enums';
import { format } from 'date-fns';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(WarehouseStock) private stockRepository: Repository<WarehouseStock>,
    @InjectRepository(Item) private itemsRepository: Repository<Item>,
    @InjectRepository(Company) private companyRepository: Repository<Company>,
    private dataSource: DataSource,
  ) {}

  async receiveItems(dto: ReceiveItemsDto, userId: string, companyId: string) {
    if (!companyId) throw new BadRequestException('Company context required');

    return this.dataSource.transaction(async (manager: QueryRunner['manager']) => {
      // 1. Get or create WarehouseStock for this category
      let stock = await manager.findOne(WarehouseStock, { where: { categoryId: dto.categoryId, companyId } });
      if (!stock) {
        stock = manager.create(WarehouseStock, {
          companyId,
          categoryId: dto.categoryId,
          totalQuantity: 0,
          availableQuantity: 0,
          distributedQuantity: 0,
        });
      }

      // 2. Fetch the company and category codes for barcode generation
      const company = await manager.findOne(Company, { where: { id: companyId } });
      const category = await manager.findOne(ItemCategory, { where: { id: dto.categoryId } });
      if (!company || !category) throw new NotFoundException('Company or category not found');

      // 3. Count matching items received today to establish our barcode sequence start index.
      // E.g. ACME-LAP-20250615-0042
      const dateStr = format(new Date(), 'yyyyMMdd');
      const countTodayQuery = manager.createQueryBuilder(Item, 'item')
        .where('item.barcode LIKE :pattern', { pattern: `${company.code}-${category.code}-${dateStr}-%` })
        .getCount();
      
      let baseSequence = await countTodayQuery;

      const newItems: Item[] = [];
      const newEvents: ItemEvent[] = [];

      for (let i = 0; i < dto.quantity; i++) {
        baseSequence++;
        const barcode = generateBarcodeString(company.code, category.code, baseSequence);
        
        const item = manager.create(Item, {
          companyId,
          categoryId: category.id,
          name: dto.name,
          barcode,
          status: ItemStatus.WAREHOUSE,
          condition: ItemCondition.NEW,
          purchasePrice: dto.unitCost,
          purchaseDate: new Date(),
          currentLocation: 'Warehouse Receiving Dock',
          receivedByUserId: userId,
        });

        const savedItem = await manager.save(Item, item);
        newItems.push(savedItem);

        // 4. Log the event timeline items
        const evt1 = manager.create(ItemEvent, {
          itemId: savedItem.id,
          eventType: ItemEventType.RECEIVED,
          fromStatus: null as any,
          toStatus: ItemStatus.WAREHOUSE,
          performedByUserId: userId,
          toLocation: 'Warehouse Receiving Dock',
        });

        const evt2 = manager.create(ItemEvent, {
          itemId: savedItem.id,
          eventType: ItemEventType.BARCODE_GENERATED,
          fromStatus: ItemStatus.WAREHOUSE,
          toStatus: ItemStatus.WAREHOUSE,
          performedByUserId: userId,
          toLocation: 'Warehouse Receiving Dock',
        });

        newEvents.push(evt1, evt2);
      }

      await manager.save(ItemEvent, newEvents);

      // 5. Update Stock
      stock.totalQuantity += dto.quantity;
      stock.availableQuantity += dto.quantity;
      await manager.save(WarehouseStock, stock);

      return {
        message: `Successfully received ${dto.quantity} items`,
        items: newItems,
      };
    });
  }

  async getStockLevels(companyId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPaginationOptions(query);

    const qb = this.stockRepository.createQueryBuilder('stock')
      .leftJoinAndSelect('stock.category', 'category')
      .where('stock.companyId = :companyId', { companyId })
      .orderBy('category.name', 'ASC')
      .skip(skip)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }
}
