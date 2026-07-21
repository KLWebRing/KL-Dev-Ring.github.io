// ── KL DevVerse — Server Bootstrap ───────────────────────────────────
// Entry point for the NestJS server.

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // CORS — allow the Vite dev server
  app.enableCors({
    origin: process.env['CLIENT_URL'] ?? 'http://localhost:5173',
    credentials: true,
  });

  // Parse cookies (for refresh tokens)
  app.use(cookieParser());

  // API prefix
  app.setGlobalPrefix('api');

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port);

  console.log(`\n  🚀 KL DevVerse API server running on http://localhost:${port}`);
  console.log(`  📡 Colyseus game server on ws://localhost:${process.env['COLYSEUS_PORT'] ?? '2567'}\n`);
}

void bootstrap();
