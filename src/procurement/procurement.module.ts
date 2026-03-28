import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ApprovalThreshold } from './entities/approval-threshold.entity';
import { WarehouseModule } from '../warehouse/warehouse.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequest, Order, OrderItem, ApprovalThreshold]),
    WarehouseModule,
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
