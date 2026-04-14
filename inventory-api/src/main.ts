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
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  }));

  // Define allowed origins natively, including standard dev variants
  const allowedOrigins: any[] = [
    'http://localhost:5173', 
    'http://127.0.0.1:5173',
    'https://localhost:5173',
    'https://localhost:5174',
    'http://localhost:5174',
    /\.localhost$/,
  ];
  
  if (process.env.FRONTEND_URL) {
    // If a FRONTEND_URL is defined, support multiple origins if comma-separated
    process.env.FRONTEND_URL.split(',').forEach(url => allowedOrigins.push(url.trim()));
  }

  // CORS
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Serve static uploads (avatars, logos, warranties, invoices)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global prefixes and pipes
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger OpenAPI Docs
  const config = new DocumentBuilder()
    .setTitle('KTMG Inventory API')
    .setDescription('Simplified Inventory Management System — Items, Barcodes, Assignments, and Tracking')
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'Admin user management with permissions')
    .addTag('Companies', 'Company management')
    .addTag('Departments', 'Department management')
    .addTag('Categories', 'Item category management')
    .addTag('Items', 'Core inventory item operations and lifecycle')
    .addTag('Labels', 'Barcode generation and printing')
    .addTag('Analytics', 'Simplified dashboard analytics')
    .addTag('Reports', 'Report generation')
    .addTag('Audit Logs', 'System activity tracking')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
// Rebuild trigger
