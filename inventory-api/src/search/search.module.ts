import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Item } from '../items/entities/item.entity';
import { User } from '../users/entities/user.entity';
import { Department } from '../departments/entities/department.entity';
import { Company } from '../companies/entities/company.entity';
import { ItemCategory } from '../items/entities/item-category.entity';
import { License } from '../licenses/entities/license.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Item,
      User,
      Department,
      Company,
      ItemCategory,
      License,
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
