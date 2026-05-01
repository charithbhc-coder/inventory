import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { ItemCategoriesService } from './item-categories.service';
import { ItemCategoriesController } from './item-categories.controller';
import { Item } from './entities/item.entity';
import { ItemCategory } from './entities/item-category.entity';
import { ItemEvent } from './entities/item-event.entity';
import { TransferRequest } from './entities/transfer-request.entity';
import { Company } from '../companies/entities/company.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ItemsScheduler } from './items.scheduler';
import { TransferRequestsController } from './transfer-requests.controller';
import { TransferRequestsService } from './transfer-requests.service';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Item, ItemCategory, ItemEvent, Company, TransferRequest, User]),
    NotificationsModule,
    UsersModule,
  ],
  controllers: [ItemsController, ItemCategoriesController, TransferRequestsController],
  providers: [ItemsService, ItemCategoriesService, ItemsScheduler, TransferRequestsService],
  exports: [ItemsService, ItemCategoriesService, TransferRequestsService],
})
export class ItemsModule {}
