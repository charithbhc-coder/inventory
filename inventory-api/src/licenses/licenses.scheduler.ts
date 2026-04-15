import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { License, LicenseStatus } from './entities/license.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums';
import { differenceInDays, startOfDay } from 'date-fns';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class LicensesScheduler {
  private readonly logger = new Logger(LicensesScheduler.name);

  constructor(
    @InjectRepository(License)
    private readonly licensesRepository: Repository<License>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkLicenseExpirations() {
    this.logger.debug('⏱ Checking for expiring software licenses...');

    const activeLicenses = await this.licensesRepository.find({
      where: {
        status: In([LicenseStatus.ACTIVE, LicenseStatus.EXPIRING_SOON]),
      },
    });

    if (activeLicenses.length === 0) return;

    // Fetch all active admins
    const admins = await this.usersRepository.find({
      where: {
        isActive: true,
        role: In([UserRole.SUPER_ADMIN, UserRole.ADMIN]),
      },
      select: ['email'],
    });
    
    const adminEmails = admins.map((u) => u.email);

    const today = startOfDay(new Date());

    for (const license of activeLicenses) {
      if (!license.expiryDate) continue;

      const expiryDate = startOfDay(new Date(license.expiryDate));
      const daysRemaining = differenceInDays(expiryDate, today);

      let shouldNotify = false;
      let newStatus = license.status;

      if (daysRemaining < 0) {
        newStatus = LicenseStatus.EXPIRED;
      } else if (daysRemaining === 0) {
        shouldNotify = true;
        newStatus = LicenseStatus.EXPIRED;
      } else if (daysRemaining === 3 || daysRemaining === 7 || daysRemaining === 30) {
        shouldNotify = true;
        newStatus = LicenseStatus.EXPIRING_SOON;
      } else if (daysRemaining < 30) {
        newStatus = LicenseStatus.EXPIRING_SOON;
      } else {
        newStatus = LicenseStatus.ACTIVE;
      }

      let _hasChanged = newStatus !== license.status;
      license.status = newStatus;

      // Make sure we only notify once per day threshold
      if (shouldNotify && license.lastNotifiedDays !== daysRemaining) {
        const recipients = new Set([...adminEmails]);
        if (license.contactEmail) {
          recipients.add(license.contactEmail);
        }

        try {
          await this.mailService.sendLicenseExpirationEmail(
            Array.from(recipients),
            license.softwareName,
            daysRemaining,
            expiryDate,
          );
          
          license.lastNotifiedAt = new Date();
          license.lastNotifiedDays = daysRemaining;
          _hasChanged = true;
          this.logger.log(`Sent expiry notification for ${license.softwareName} (Days left: ${daysRemaining})`);

          const eventName = daysRemaining <= 0 ? 'license.expired' : 'license.expiring';
          this.eventEmitter.emit(eventName, {
            licenseId: license.id,
            softwareName: license.softwareName,
            daysRemaining,
          });
        } catch (error) {
          this.logger.error(`Failed to send expiry notification for license ${license.id}`, error);
        }
      }

      if (_hasChanged) {
        await this.licensesRepository.save(license);
      }
    }
  }
}
