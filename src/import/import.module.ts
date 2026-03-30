import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../departments/entities/department.entity';
import { User } from '../users/entities/user.entity';
import { Item } from '../items/entities/item.entity';
import { ItemCategory } from '../items/entities/item-category.entity';
import { ItemEvent } from '../items/entities/item-event.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Department, User, Item, ItemCategory, ItemEvent]),
  ],
  controllers: [ImportController],
  providers: [ImportService]
})
export class ImportModule {}
