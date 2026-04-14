import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  Logger.log('Starting application...');
  const app = await NestFactory.create(AppModule);
  Logger.log('Application started successfully');
  await app.listen(envs.PORT ?? 3000);
  Logger.log(`Application is running on port ${envs.PORT ?? 3000}`);
  Logger.log(`Version: 3.0.0`);
}
bootstrap();