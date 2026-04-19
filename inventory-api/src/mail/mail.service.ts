import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import mjml2html from 'mjml';

import { passwordResetTemplate } from './templates/password-reset.mjml';
import { firstLoginTemplate } from './templates/first-login.mjml';
import { passwordChangedTemplate } from './templates/password-changed.mjml';
import { welcomeTemplate } from './templates/welcome.mjml';
import { accountProvisionedTemplate } from './templates/account-provisioned.mjml';
import { systemNotificationTemplate } from './templates/system-notification.mjml';
import { reportNewsletterTemplate } from './templates/report-newsletter.mjml';
import { licenseExpirationTemplate } from './templates/license-expiration.mjml';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const service = this.configService.get<string>('MAIL_SERVICE');
    
    if (!host && !service) {
      this.logger.warn('SMTP Mail configuration missing. Email service will be disabled.');
      return;
    }

    const auth = {
      user: this.configService.get<string>('MAIL_USER'),
      pass: this.configService.get<string>('MAIL_PASS'),
    };

    const portStr = this.configService.get('MAIL_PORT');
    const port = portStr ? Number(portStr) : 587;
    let secure = this.configService.get<string>('MAIL_SECURE') === 'true';

    // 🔒 Auto-correct security based on standard ports to prevent configuration errors:
    // Port 465 = Implicit SSL (secure: true)
    // Port 587 = STARTTLS (secure: false)
    if (port === 465) secure = true;
    if (port === 587) secure = false;

    this.transporter = nodemailer.createTransport({
      service,
      host,
      port,
      secure,
      auth,
      tls: {
        // Modern security defaults
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    });
  }

  async onModuleInit() {
    if (this.transporter) {
      this.logger.log('📧 Mail configuration detected. Verifying connection...');
      try {
        await this.transporter.verify();
        this.logger.log('✅ SMTP Connection verified. Ready to send emails.');
      } catch (error) {
        this.logger.error(`❌ SMTP Connection failed: ${error.message}`);
        this.logger.warn('Email delivery might be unavailable until settings are corrected.');
      }
    }
  }

  // 🛡️ Safe check for transporter
  private isConfigured(): boolean {
    return !!this.transporter;
  }

  // 🕒 Timezone-aware timestamp generator
  private getFormattedTimestamp(): string {
    const tz = this.configService.get<string>('SYSTEM_TIMEZONE');
    if (tz) {
      try {
        return new Date().toLocaleString('en-US', { timeZone: tz });
      } catch (e) {
        // Fallback if invalid timezone string provided
      }
    }
    return new Date().toLocaleString();
  }

  // 🔧 Common sender
  private async sendMail(to: string, subject: string, html: string) {
    if (!this.isConfigured()) {
      this.logger.warn(`Skipping email to ${to} (Mail not configured)`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.configService.get<string>('MAIL_FROM'),
        to,
        subject,
        html,
      });

      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error.stack);
    }
  }

  // 📨 REPORT / NEWSLETTER DISPATCH
  async sendReportEmail(
    recipients: string[],
    subject: string,
    body: string,
    attachments: { filename: string; content: Buffer; contentType: string }[] = [],
  ): Promise<void> {
    const attachmentNote = attachments.length > 0
      ? `${attachments.length} file(s) attached: ${attachments.map(a => a.filename).join(', ')}`
      : '';

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = reportNewsletterTemplate(subject, body, attachmentNote, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    for (const to of recipients) {
      try {
        if (!this.isConfigured()) {
          this.logger.warn(`Skipping report email to ${to} (Mail not configured)`);
          continue;
        }
        await this.transporter.sendMail({
          from: this.configService.get<string>('MAIL_FROM'),
          to,
          subject,
          html,
          attachments: attachments.map(a => ({
            filename: a.filename,
            content: a.content,
            contentType: a.contentType,
          })),
        });
        this.logger.log(`Report email sent to ${to}: ${subject}`);
      } catch (error) {
        this.logger.error(`Failed to send report email to ${to}`, error.stack);
      }
    }
  }

  // 🔴 PASSWORD RESET
  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const timestamp = this.getFormattedTimestamp();

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = passwordResetTemplate(name, resetLink, timestamp, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, `${systemName}: Password Reset Request`, html);
  }

  // 🟢 PASSWORD CHANGED
  async sendPasswordChangedEmail(to: string, name: string) {
    const timestamp = this.getFormattedTimestamp();

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = passwordChangedTemplate(name, timestamp, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, `${systemName}: Password Changed`, html);
  }

  // 🔵 FIRST LOGIN (Security Alert)
  async sendFirstLoginEmail(to: string, name: string) {
    const dashboardLink = `${this.configService.get('FRONTEND_URL')}/dashboard`;
    const timestamp = this.getFormattedTimestamp();

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = firstLoginTemplate(name, dashboardLink, timestamp, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, `${systemName}: Security Alert - First Time Login`, html);
  }

  // 🟡 ACCOUNT PROVISIONED (Initial Access)
  async sendAccountProvisionedEmail(to: string, name: string, tempPassword: string) {
    const loginLink = `${this.configService.get('FRONTEND_URL')}/login`;

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = accountProvisionedTemplate(name, to, tempPassword, loginLink, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, `${systemName}: Account Provisioned`, html);
  }

  // ✨ WELCOME EMAIL (Onboarding Complete)
  async sendWelcomeEmail(to: string, name: string) {
    const dashboardLink = `${this.configService.get('FRONTEND_URL')}/dashboard`;

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = welcomeTemplate(name, dashboardLink, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, `Welcome to ${systemName}`, html);
  }

  // ⚠️ Deprecated - please use sendAccountProvisionedEmail
  async sendWelcomeEmailWithTempPassword(to: string, name: string, tempPassword: string) {
    return this.sendAccountProvisionedEmail(to, name, tempPassword);
  }

  // 🔑 LICENSE EXPIRATION ALERTS
  async sendLicenseExpirationEmail(to: string[], licenseName: string, daysRemaining: number, expiryDate: Date) {
    const dashboardLink = `${this.configService.get('FRONTEND_URL')}/licenses`;
    // Format date beautifully
    const expiryDateStr = expiryDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = licenseExpirationTemplate(licenseName, daysRemaining, expiryDateStr, dashboardLink, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    const subject = daysRemaining <= 0 
      ? `🚨 URGENT: Software License Expired - ${licenseName}`
      : `⚠️ Action Required: License Expiring in ${daysRemaining} Days - ${licenseName}`;

    // Send to all array elements individually (or join them if you prefer BCC, but individually is safer)
    for (const recipient of to) {
      if (!recipient) continue;
      await this.sendMail(recipient, subject, html);
    }
  }

  // 🔔 SYSTEM COMPONENT NOTIFICATIONS
  async sendSystemNotificationEmail(to: string, title: string, message: string, actionUrl?: string) {
    let fullUrl = actionUrl;
    if (actionUrl && actionUrl.startsWith('/')) {
      fullUrl = `${this.configService.get('FRONTEND_URL')}${actionUrl}`;
    }

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = systemNotificationTemplate(title, message, fullUrl, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, title, html);
  }
}