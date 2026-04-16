import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

/**
 * BootstrapService runs automatically on every application startup.
 * It ensures the Super Admin account exists — no manual seeding required.
 * If the user already exists, it does nothing.
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureSuperAdmin();
  }

  private async ensureSuperAdmin(): Promise<void> {
    // Read from environment variables, with sane defaults
    const email = (
      process.env.SUPER_ADMIN_EMAIL || 'ktmg-vault@ktdoctor.com'
    ).toLowerCase();
    const tempPass = process.env.SUPER_ADMIN_TEMP_PASS || 'Admin@123';
    const firstName = process.env.SUPER_ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.SUPER_ADMIN_LAST_NAME || 'Admin';

    try {
      const existing = await this.usersRepository.findOne({ where: { email } });

      if (existing) {
        this.logger.log(`Super Admin (${email}) already exists. Skipping.`);
        return;
      }

      const passwordHash = await bcrypt.hash(tempPass, 12);

      const superAdmin = this.usersRepository.create({
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'SUPER_ADMIN',
        isActive: true,
        mustChangePassword: true,
        passwordHistory: [passwordHash],
      });

      await this.usersRepository.save(superAdmin);

      this.logger.log(`✅ Super Admin created: ${email}`);
      this.logger.log(`   Temporary password: ${tempPass}`);
      this.logger.log(`   User must change password on first login.`);
    } catch (error) {
      this.logger.error('❌ Failed to ensure Super Admin exists:', error);
    }
  }
}
