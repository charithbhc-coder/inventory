const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { LicensesScheduler } = require('./dist/licenses/licenses.scheduler');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const scheduler = app.get(LicensesScheduler);
  
  await scheduler.checkLicenseExpirations();
  
  await app.close();
  console.log('Scheduler test complete');
}

bootstrap();
