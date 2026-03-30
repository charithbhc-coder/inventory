import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsScheduler } from './reports.scheduler';
import { ScheduledReport } from './entities/scheduled-report.entity';
import { ExcelGenerator } from './generators/excel.generator';
import { PdfGenerator } from './generators/pdf.generator';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledReport]),
    MailModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService, 
    ReportsScheduler, 
    ExcelGenerator, 
    PdfGenerator
  ],
})
export class ReportsModule {}
