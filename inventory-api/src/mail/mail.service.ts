import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import mjml2html from 'mjml';

import { passwordResetTemplate } from './templates/password-reset.mjml';
import { firstLoginTemplate } from './templates/first-login.mjml';
import { passwordChangedTemplate } from './templates/password-changed.mjml';
import { welcomeTemplate } from './templates/welcome.mjml';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
    });
  }

  // 🔧 Common sender
  private async sendMail(to: string, subject: string, html: string) {
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

  // 🔴 PASSWORD RESET
  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const timestamp = new Date().toLocaleString();

    const mjmlContent = passwordResetTemplate(name, resetLink, timestamp);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, 'Password Reset Request', html);
  }

  // 🟢 PASSWORD CHANGED
  async sendPasswordChangedEmail(to: string, name: string) {
    const dashboardLink = `${this.configService.get('FRONTEND_URL')}/dashboard`;

    const mjmlContent = passwordChangedTemplate(name, dashboardLink);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, 'Your Password Has Been Changed', html);
  }

  // 🔵 FIRST LOGIN
  async sendFirstLoginEmail(to: string, name: string) {
    const dashboardLink = `${this.configService.get('FRONTEND_URL')}/dashboard`;
    const timestamp = new Date().toLocaleString();

    const mjmlContent = firstLoginTemplate(name, dashboardLink, timestamp);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, 'Security Alert: First Time Login from Your Account', html);
  }

  // 🟡 WELCOME EMAIL
  async sendWelcomeEmailWithTempPassword(to: string, name: string, tempPassword: string) {
    const loginLink = `${this.configService.get('FRONTEND_URL')}/login`;

    const mjmlContent = welcomeTemplate(name, to, tempPassword, loginLink);
    const { html } = mjml2html(mjmlContent);

    await this.sendMail(to, 'Welcome to Inventory Management System', html);
  }
}