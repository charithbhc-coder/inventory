import { Module } from '@nestjs/common';
import { DepreciationController } from './depreciation.controller';
import { DepreciationService } from './depreciation.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepreciationConfig } from './entities/depreciation-config.entity';
import { ItemDepreciationSnapshot } from './entities/item-depreciation-snapshot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DepreciationConfig, ItemDepreciationSnapshot])],
  controllers: [DepreciationController],
  providers: [DepreciationService],
})
export class DepreciationModule {}
