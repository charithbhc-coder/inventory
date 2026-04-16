import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe, Logger } from '@nestjs/common';
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
    prefix: '/inventory-api/v1/uploads/',
  });

  // Global prefixes and pipes
  app.setGlobalPrefix('inventory-api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Application is running on port ${port}`);
}
bootstrap();
// Rebuild trigger
