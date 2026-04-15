import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Item } from './entities/item.entity';
import { ItemStatus } from '../common/enums';
import { differenceInDays, startOfDay } from 'date-fns';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ItemsScheduler {
  private readonly logger = new Logger(ItemsScheduler.name);

  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkWarrantyExpirations() {
    this.logger.debug('⏱ Checking for expiring item warranties...');

    // Load items that are not disposed or lost and have a warranty expiration date
    const items = await this.itemsRepository.find({
      select: ['id', 'barcode', 'name', 'companyId', 'warrantyExpiresAt'],
      where: {
        status: Not(In([ItemStatus.DISPOSED, ItemStatus.LOST])),
      },
    });

    const activeItems = items.filter(i => i.warrantyExpiresAt !== null);

    if (activeItems.length === 0) return;

    const today = startOfDay(new Date());

    for (const item of activeItems) {
      const expiryDate = startOfDay(new Date(item.warrantyExpiresAt!));
      const daysRemaining = differenceInDays(expiryDate, today);

      let shouldNotify = false;

      // Only notify exactly on these thresholds to prevent daily email spam
      if (daysRemaining === 30 || daysRemaining === 7 || daysRemaining === 3 || daysRemaining === 0) {
        shouldNotify = true;
      }

      if (shouldNotify) {
        const eventName = daysRemaining === 0 ? 'item.warranty_expired' : 'item.warranty_expiring';
        this.eventEmitter.emit(eventName, {
          itemId: item.id,
          barcode: item.barcode,
          itemName: item.name,
          companyId: item.companyId,
          daysRemaining,
        });
        
        this.logger.log(`Emitted warranty expiry event for item: ${item.barcode} (Days left: ${daysRemaining})`);
      }
    }
  }
}
