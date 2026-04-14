import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicensesService } from './licenses.service';
import { LicensesController } from './licenses.controller';
import { License } from './entities/license.entity';
import { LicensesScheduler } from './licenses.scheduler';
import { MailModule } from '../mail/mail.module';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([License, User]),
    MailModule,
  ],
  controllers: [LicensesController],
  providers: [LicensesService, LicensesScheduler],
  exports: [LicensesService],
})
export class LicensesModule {}
