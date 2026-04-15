import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { ItemCategoriesService } from './item-categories.service';
import { ItemCategoriesController } from './item-categories.controller';
import { Item } from './entities/item.entity';
import { ItemCategory } from './entities/item-category.entity';
import { ItemEvent } from './entities/item-event.entity';
import { Company } from '../companies/entities/company.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ItemsScheduler } from './items.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item, ItemCategory, ItemEvent, Company]),
    NotificationsModule,
  ],
  controllers: [ItemsController, ItemCategoriesController],
  providers: [ItemsService, ItemCategoriesService, ItemsScheduler],
  exports: [ItemsService, ItemCategoriesService],
})
export class ItemsModule {}
