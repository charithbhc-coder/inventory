import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsService } from './vendors.service';
import { VendorsController } from './vendors.controller';
import { Vendor } from './entities/vendor.entity';
import { Item } from '../items/entities/item.entity';
import { Order } from '../procurement/entities/order.entity';
import { RepairJob } from '../repairs/entities/repair-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vendor, Item, Order, RepairJob])],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
