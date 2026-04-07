import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';

async function bootstrap() {
  Logger.log('Starting application...');
  const app = await NestFactory.create(AppModule);
  Logger.log('Application started successfully');
  app.use(json({ limit: '10mb' })); // Ajusta el límite según necesites
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  await app.listen(envs.PORT ?? 3000);
  Logger.log(`Application is running on port ${envs.PORT ?? 3000}`);
  Logger.log(`Version: 2.0.0`);
}
bootstrap();