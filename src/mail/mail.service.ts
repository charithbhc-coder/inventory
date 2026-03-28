import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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

  async sendPasswordResetEmail(to: string, name: string, token: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hi ${name},</p>
          <p>You recently requested to reset your password for your Inventory Management System account.</p>
          <p>Click the link below to reset it. This link will expire in 30 minutes.</p>
          <div style="margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #1677ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Your Password
            </a>
          </div>
          <p>If you did not request a password reset, please ignore this email or reply to let us know. This password reset is only valid for the next 30 minutes.</p>
          <p>Thanks,<br>The Inventory System Team</p>
          <hr style="margin-top: 40px; border: none; border-top: 1px solid #eaeaea;">
          <p style="color: #888; font-size: 12px;">If you're having trouble clicking the password reset button, copy and paste the URL below into your web browser:</p>
          <p style="color: #888; font-size: 12px; word-break: break-all;">${resetLink}</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error.stack);
      // We don't throw here to avoid exposing email sending errors to the client,
      // which could be used for user enumeration or cause the forgot-password flow to fail abruptly.
    }
  }

  async sendWelcomeEmailWithTempPassword(to: string, name: string, tempPassword: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const loginLink = `${frontendUrl}/login`;

    const mailOptions = {
      from: this.configService.get<string>('MAIL_FROM'),
      to,
      subject: 'Welcome to Inventory Management System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Welcome to the Inventory Management System!</h2>
          <p>Hi ${name},</p>
          <p>An account has been created for you. Please use the temporary password below to log in for the first time.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Username:</strong> ${to}</p>
            <p style="margin: 10px 0 0;"><strong>Temporary Password:</strong> <code style="font-size: 16px; background-color: #e8e8e8; padding: 2px 6px;">${tempPassword}</code></p>
          </div>
          <p>You will be required to change your password immediately upon logging in.</p>
          <div style="margin: 30px 0;">
            <a href="${loginLink}" style="background-color: #1677ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Log In Now
            </a>
          </div>
          <p>Thanks,<br>The Inventory System Team</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error.stack);
    }
  }
}
