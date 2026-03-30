import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { ItemCategoriesService } from './item-categories.service';
import { ItemCategoriesController } from './item-categories.controller';
import { Item } from './entities/item.entity';
import { ItemCategory } from './entities/item-category.entity';
import { ItemEvent } from './entities/item-event.entity';
import { WarehouseStock } from '../warehouse/entities/warehouse-stock.entity';
import { Company } from '../companies/entities/company.entity';
import { CategoryCustomField } from './entities/category-custom-field.entity';
import { ItemCustomValue } from './entities/item-custom-value.entity';
import { CustomFieldsService } from './custom-fields.service';
import { CustomFieldsController } from './custom-fields.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Item, ItemCategory, ItemEvent, WarehouseStock, Company, CategoryCustomField, ItemCustomValue])],
  controllers: [ItemsController, ItemCategoriesController, CustomFieldsController],
  providers: [ItemsService, ItemCategoriesService, CustomFieldsService],
  exports: [ItemsService, ItemCategoriesService, CustomFieldsService],
})
export class ItemsModule {}
