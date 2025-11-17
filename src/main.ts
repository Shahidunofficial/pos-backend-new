import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configure Express body parser for JSON and URL-encoded data
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Enable CORS for frontend communication
  app.enableCors({
    origin: ['http://localhost:3000','http://localhost:3002', 'http://127.0.0.1:3000', '0.0.0.0'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.listen(3001);
  console.log('POS Backend server is running on http://localhost:3001');
  console.log('✅ File upload support enabled with 50MB limit');
}
bootstrap();
