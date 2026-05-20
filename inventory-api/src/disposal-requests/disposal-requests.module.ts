import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DisposalRequest } from './entities/disposal-request.entity';
import { DisposalRequestsService } from './disposal-requests.service';
import { DisposalRequestsController } from './disposal-requests.controller';
import { Item } from '../items/entities/item.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DisposalRequest, Item, ItemEvent]),
    NotificationsModule,
  ],
  controllers: [DisposalRequestsController],
  providers: [DisposalRequestsService],
  exports: [DisposalRequestsService],
})
export class DisposalRequestsModule {}
