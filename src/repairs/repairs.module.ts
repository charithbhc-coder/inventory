import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RepairsService } from './repairs.service';
import { RepairsController } from './repairs.controller';
import { RepairJob } from './entities/repair-job.entity';
import { RepairUpdate } from './entities/repair-update.entity';
import { DisposalRequest } from './entities/disposal-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RepairJob, RepairUpdate, DisposalRequest])],
  controllers: [RepairsController],
  providers: [RepairsService],
  exports: [RepairsService],
})
export class RepairsModule {}
