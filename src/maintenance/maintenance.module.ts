import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceSchedule } from './entities/maintenance-schedule.entity';
import { MaintenanceRecord } from './entities/maintenance-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceSchedule, MaintenanceRecord])],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
