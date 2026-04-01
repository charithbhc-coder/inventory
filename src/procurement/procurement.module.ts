import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';
import { PurchaseRequest } from './entities/purchase-request.entity';
import { PurchaseRequestItem } from './entities/purchase-request-item.entity';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ApprovalThreshold } from './entities/approval-threshold.entity';
import { Requisition } from './entities/requisition.entity';
import { WarehouseModule } from '../warehouse/warehouse.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseRequest,
      PurchaseRequestItem,
      Order,
      OrderItem,
      ApprovalThreshold,
      Requisition,
    ]),
    WarehouseModule,
  ],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
