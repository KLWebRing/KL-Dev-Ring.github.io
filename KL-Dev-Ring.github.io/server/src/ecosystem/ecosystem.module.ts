// ── KL DevVerse — Ecosystem Module ───────────────────────────────────
// Wires all Builder Ecosystem Engine services (Phase 7).

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EvolutionService } from './evolution.service';
import { EvolutionController } from './evolution.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [EvolutionController],
  providers: [EvolutionService],
  exports: [EvolutionService],
})
export class EcosystemModule {}
