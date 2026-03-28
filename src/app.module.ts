import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';

import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { DepartmentsModule } from './departments/departments.module';
import { ItemsModule } from './items/items.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { MailModule } from './mail/mail.module';

import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { VendorsModule } from './vendors/vendors.module';
import { ProcurementModule } from './procurement/procurement.module';
import { RepairsModule } from './repairs/repairs.module';
import { TransfersModule } from './transfers/transfers.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.user'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        autoLoadEntities: true,
        synchronize: true, // Use migrations in production! True is okay for early Phase 1 dev start
      }),
      inject: [ConfigService],
    }),
    MailModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    DepartmentsModule,
    ItemsModule,
    WarehouseModule,
    AuditLogsModule,
    VendorsModule,
    ProcurementModule,
    RepairsModule,
    TransfersModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
