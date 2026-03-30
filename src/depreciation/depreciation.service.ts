import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DepreciationConfig } from './entities/depreciation-config.entity';
import { ItemDepreciationSnapshot } from './entities/item-depreciation-snapshot.entity';
import { DepreciationMethod } from '../common/enums';
import { Item } from '../items/entities/item.entity';

@Injectable()
export class DepreciationService {
  private readonly logger = new Logger(DepreciationService.name);

  constructor(
    @InjectRepository(DepreciationConfig)
    private configRepository: Repository<DepreciationConfig>,
    @InjectRepository(ItemDepreciationSnapshot)
    private snapshotRepository: Repository<ItemDepreciationSnapshot>,
  ) {}

  @Cron('0 0 1 * *') // Runs at 00:00 on day-of-month 1
  async handleMonthlyDepreciation() {
    this.logger.log('Starting monthly depreciation calculation...');
    
    // In a real production app, use pagination or a stream for large item sets
    const items = await this.configRepository.manager.find(Item, {
      relations: ['category'],
    });

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    for (const item of items) {
      try {
        // Find config: Item specific > Category specific
        const config = await this.configRepository.findOne({
          where: [
            { itemId: item.id },
            { categoryId: item.categoryId, itemId: IsNull() }
          ],
          order: { itemId: 'DESC' } // Item-specific (non-null) will come first if both exist
        });

        if (!config) continue;

        // Check if item has purchase price
        if (!item.purchasePrice || item.purchasePrice <= 0) continue;

        // Get last snapshot to find current book value and accumulated dep
        const lastSnapshot = await this.snapshotRepository.findOne({
          where: { itemId: item.id },
          order: { snapshotDate: 'DESC' }
        });

        let currentBookValue = lastSnapshot ? Number(lastSnapshot.bookValue) : Number(item.purchasePrice);
        let accumulatedDep = lastSnapshot ? Number(lastSnapshot.accumulatedDepreciation) : 0;

        if (currentBookValue <= Number(config.salvageValue)) continue;

        let depThisPeriod = 0;

        if (config.method === DepreciationMethod.STRAIGHT_LINE && config.usefulLifeYears) {
          const annualDep = (Number(item.purchasePrice) - Number(config.salvageValue)) / Number(config.usefulLifeYears);
          depThisPeriod = annualDep / 12;
        } else if (config.method === DepreciationMethod.REDUCING_BALANCE && config.depreciationRate) {
          depThisPeriod = currentBookValue * (Number(config.depreciationRate) / 12);
        } else if (config.method === DepreciationMethod.MANUAL) {
          // Manual requires admin intervention, maybe skip or log
          continue;
        }

        // Don't depreciate below salvage value
        if (currentBookValue - depThisPeriod < Number(config.salvageValue)) {
          depThisPeriod = currentBookValue - Number(config.salvageValue);
        }

        const newBookValue = currentBookValue - depThisPeriod;
        const newAccumulatedDep = accumulatedDep + depThisPeriod;

        await this.snapshotRepository.save({
          itemId: item.id,
          snapshotDate: firstDayOfMonth,
          purchasePrice: item.purchasePrice,
          accumulatedDepreciation: newAccumulatedDep,
          bookValue: newBookValue,
          depreciationThisPeriod: depThisPeriod,
          methodUsed: config.method,
        });

      } catch (err) {
        this.logger.error(`Error calculating depreciation for item ${item.id}: ${err.message}`);
      }
    }
    
    this.logger.log('Monthly depreciation calculation completed.');
  }

  async getDepreciationReport(companyId: string) {
    // Basic aggregation for current book value per category
    return this.snapshotRepository.createQueryBuilder('s')
      .innerJoin('s.item', 'item')
      .where('item.companyId = :companyId', { companyId })
      .andWhere('s.snapshotDate = (SELECT MAX(snapshotDate) FROM item_depreciation_snapshots WHERE itemId = s.itemId)')
      .select([
        'item.categoryId as categoryId',
        'SUM(s.purchasePrice) as totalPurchasePrice',
        'SUM(s.accumulatedDepreciation) as totalAccumulatedDepreciation',
        'SUM(s.bookValue) as totalBookValue'
      ])
      .groupBy('item.categoryId')
      .getRawMany();
  }
}
