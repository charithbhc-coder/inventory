import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ScheduledReport, FileFormat, ReportFrequency } from './entities/scheduled-report.entity';
import { ReportsService } from './reports.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ReportsScheduler {
  private readonly logger = new Logger(ReportsScheduler.name);

  constructor(
    @InjectRepository(ScheduledReport)
    private scheduledReportRepo: Repository<ScheduledReport>,
    private reportsService: ReportsService,
    private mailService: MailService,
  ) { }

  // ─── PRODUCTION: runs every minute to check for due reports ────────
  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledReports() {
    this.logger.debug('⏱ Checking for due scheduled reports...');

    const now = new Date();
    const dueSchedules = await this.scheduledReportRepo.find({
      where: {
        isActive: true,
        nextRunAt: LessThanOrEqual(now),
      },
    });

    if (dueSchedules.length === 0) {
      this.logger.debug('No scheduled reports are due at this time.');
      return;
    }

    this.logger.log(`Found ${dueSchedules.length} scheduled report(s) to process.`);

    for (const schedule of dueSchedules) {
      await this.processSchedule(schedule);
    }
  }

  private async processSchedule(schedule: ScheduledReport): Promise<void> {
    try {
      this.logger.log(`Processing schedule [${schedule.id}] type=${schedule.reportType} freq=${schedule.frequency}`);

      const filters = (schedule.filters ?? {}) as any;
      const attachments: { filename: string; content: Buffer; contentType: string }[] = [];

      const shouldPdf = schedule.fileFormat === FileFormat.PDF || schedule.fileFormat === FileFormat.BOTH;
      const shouldExcel = schedule.fileFormat === FileFormat.EXCEL || schedule.fileFormat === FileFormat.BOTH;

      if (shouldPdf) {
        const buf = await this.reportsService.generateReportBuffer(schedule.reportType, 'PDF', filters, 'System Scheduler');
        attachments.push({
          filename: `${schedule.reportType}_report_${this.dateStamp()}.pdf`,
          content: buf,
          contentType: 'application/pdf',
        });
      }
      if (shouldExcel) {
        const buf = await this.reportsService.generateReportBuffer(schedule.reportType, 'EXCEL', filters, 'System Scheduler');
        attachments.push({
          filename: `${schedule.reportType}_report_${this.dateStamp()}.xlsx`,
          content: buf,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }

      const body = schedule.bodyMessage || `Please find your scheduled ${schedule.reportType} report attached.`;
      await this.mailService.sendReportEmail(schedule.recipientEmails, schedule.subject, body, attachments);

      // Update tracking
      schedule.lastSentAt = new Date();
      if (schedule.frequency === ReportFrequency.ONCE) {
        schedule.isActive = false;
        schedule.nextRunAt = null;
      } else {
        schedule.nextRunAt = this.reportsService.computeNextRun(
          schedule.frequency,
          schedule.timeOfDay,
          schedule.dayOfWeek,
          schedule.dayOfMonth,
          schedule.specificDate,
        );
      }
      await this.scheduledReportRepo.save(schedule);

      this.logger.log(`✅ Schedule [${schedule.id}] executed. Next run: ${schedule.nextRunAt?.toISOString()}`);
    } catch (err) {
      this.logger.error(`❌ Failed to process schedule [${schedule.id}]`, err?.stack);
    }
  }

  private dateStamp(): string {
    return new Date().toISOString().split('T')[0];
  }
}
