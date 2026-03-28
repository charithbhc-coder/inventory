import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';
import { WarehouseStock } from './entities/warehouse-stock.entity';
import { Item } from '../items/entities/item.entity';
import { ItemCategory } from '../items/entities/item-category.entity';
import { ItemEvent } from '../items/entities/item-event.entity';
import { Company } from '../companies/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseStock, Item, ItemCategory, ItemEvent, Company])],
  controllers: [WarehouseController],
  providers: [WarehouseService],
  exports: [WarehouseService],
})
export class WarehouseModule {}
