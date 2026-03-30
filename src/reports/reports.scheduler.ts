import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduledReport, FileFormat } from './entities/scheduled-report.entity';
import { ReportsService } from './reports.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ReportsScheduler {
  private readonly logger = new Logger(ReportsScheduler.name);

  constructor(
    @InjectRepository(ScheduledReport)
    private scheduledReportRepo: Repository<ScheduledReport>,
    private reportsService: ReportsService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // Run every night at midnight 
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyReports() {
    this.logger.debug('Running nightly scheduled reports cron job');

    // In a real system we'd query active scheduled reports for DAILY, evaluate WEEKLY based on dayOfWeek, etc.
    const activeSchedules = await this.scheduledReportRepo.find({
        where: { isActive: true },
        relations: ['company'],
    });

    if (activeSchedules.length === 0) {
      this.logger.debug('No scheduled reports configured. Generating dummy system-wide summary context demo...');
      await this.sendDemoNightlyReport();
      return;
    }

    for (const schedule of activeSchedules) {
        // Build buffer
        this.logger.log(`Processing report ${schedule.id} for company ${schedule.company.name}`);
        // ... (execution logic passing buffer to MailService) ...
        
        schedule.lastSentAt = new Date();
        await this.scheduledReportRepo.save(schedule);
    }
  }

  // Backup dev method to demonstrate the pipeline
  async sendDemoNightlyReport() {
     const testEmail = this.configService.get<string>('SUPER_ADMIN_EMAIL');
     if (!testEmail) return;

     const pdfBuffer = await this.reportsService.exportGlobalAssetRegisterPdf();
     
     // We can just use node mailer logic internal here to attach and fire
     try {
       this.logger.log(`Simulating emailing Nightly Report to ${testEmail}`);
       // ... integration with this.mailService.transporter.sendMail() ...
     } catch(e) {
       this.logger.error('Failed to send demo email', e);
     }
  }
}
