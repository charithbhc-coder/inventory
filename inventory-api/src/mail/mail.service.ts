import { Injectable, Logger } from '@nestjs/common';
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
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    if (!host) {
      this.logger.warn('SMTP Mail Host not configured. Email service will be disabled.');
      return;
    }

    const authType = this.configService.get<string>('MAIL_AUTH_TYPE');
    const auth: any = {
      user: this.configService.get<string>('MAIL_USER'),
    };

    if (authType === 'OAuth2') {
      auth.type = 'OAuth2';
      auth.clientId = this.configService.get<string>('OAUTH_CLIENT_ID');
      auth.clientSecret = this.configService.get<string>('OAUTH_CLIENT_SECRET');
      auth.refreshToken = this.configService.get<string>('OAUTH_REFRESH_TOKEN');
    } else {
      auth.pass = this.configService.get<string>('MAIL_PASS');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth,
    });
  }

  // 🛡️ Safe check for transporter
  private isConfigured(): boolean {
    return !!this.transporter;
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
    const timestamp = new Date().toLocaleString();

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = passwordResetTemplate(name, resetLink, timestamp, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, `${systemName}: Password Reset Request`, html);
  }

  // 🟢 PASSWORD CHANGED
  async sendPasswordChangedEmail(to: string, name: string) {
    const timestamp = new Date().toLocaleString();

    const systemName = this.configService.get<string>('SYSTEM_NAME') || 'Inventory';
    const systemOrg = this.configService.get<string>('SYSTEM_ORG') || 'Company';
    const mjmlContent = passwordChangedTemplate(name, timestamp, systemName, systemOrg);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, `${systemName}: Password Changed`, html);
  }

  // 🔵 FIRST LOGIN (Security Alert)
  async sendFirstLoginEmail(to: string, name: string) {
    const dashboardLink = `${this.configService.get('FRONTEND_URL')}/dashboard`;
    const timestamp = new Date().toLocaleString();

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