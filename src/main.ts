import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Security Headers
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Serve static UI assets (Avatar uploads)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefixes and pipes
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // Auto transform payloads to DTO instances
    }),
  );

  // Swagger OpenAPI Docs
  const config = new DocumentBuilder()
    .setTitle('Enterprise Inventory API')
    .setDescription('Full REST API for multi-tenant Inventory, Procurement, Repairs, and Asset Lifecycle Management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and SSO endpoints')
    .addTag('Companies', 'Multi-tenant company management')
    .addTag('Items', 'Core inventory item operations and lifecycle')
    .addTag('Custom Fields', 'Dynamic category-specific attribute management')
    .addTag('Warehouse', 'Stock management and storage locations')
    .addTag('Procurement', 'Purchase requests and vendor orders')
    .addTag('Repairs', 'Maintenance and repair job tracking')
    .addTag('Maintenance', 'Preventive maintenance scheduling')
    .addTag('Depreciation', 'Asset valuation and snapshots')
    .addTag('Transfers', 'Inter-departmental item transfers')
    .addTag('Reports', 'PDF/Excel export and data analysis')
    .addTag('Imports', 'Bulk data ingestion via Excel')
    .addTag('Audit Logs', 'Immutable system activity tracking')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
