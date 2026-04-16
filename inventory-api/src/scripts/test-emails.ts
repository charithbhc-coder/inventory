import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MailService } from '../mail/mail.service';

async function bootstrap() {
  console.log('Bootstrapping app context for email testing...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const mailService = app.get(MailService);
  
  const targetEmail = 'KTMG-Vault@ktdoctor.com';
  const name = 'Admin';
  
  try {
    console.log('1. Sending Password Reset Email...');
    await mailService.sendPasswordResetEmail(targetEmail, name, 'dummy-reset-token-12345');
    
    console.log('2. Sending Password Changed Email...');
    await mailService.sendPasswordChangedEmail(targetEmail, name);

    console.log('3. Sending First Login (Security Alert) Email...');
    await mailService.sendFirstLoginEmail(targetEmail, name);

    console.log('4. Sending Account Provisioned Email...');
    await mailService.sendAccountProvisionedEmail(targetEmail, name, 'Temp@Pass123!');

    console.log('5. Sending Welcome Email...');
    await mailService.sendWelcomeEmail(targetEmail, name);

    console.log('✅ All test emails sent successfully!');
  } catch (err) {
    console.error('Failed to send emails:', err);
  } finally {
    await app.close();
  }
}

bootstrap().catch(console.error);
