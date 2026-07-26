// ── KL DevVerse — Server Bootstrap ───────────────────────────────────
// Entry point for the NestJS server.
// Cloud-native: no localhost assumptions.

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const clientUrl = process.env['CLIENT_URL'] ?? 'http://localhost:5173';
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';

  // CORS — allow the configured client origin
  app.enableCors({
    origin: clientUrl,
    credentials: true,
  });

  // Parse cookies (for refresh tokens)
  app.use(cookieParser());

  // API prefix
  app.setGlobalPrefix('api');

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  const colyseusPort = process.env['COLYSEUS_PORT'] ?? '2567';

  await app.listen(port);

  console.log(`\n  🚀 KL DevVerse API server running on port ${port}`);
  console.log(`  📡 Colyseus game server on port ${colyseusPort}`);
  console.log(`  🌍 Environment: ${nodeEnv}`);
  console.log(`  🔗 Client: ${clientUrl}\n`);
}

void bootstrap();
