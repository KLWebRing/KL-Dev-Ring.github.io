// ── KL DevVerse — Ecosystem Module ───────────────────────────────────
// Wires all Builder Ecosystem Engine services (Phase 7).

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EvolutionService } from './evolution.service';
import { EvolutionController } from './evolution.controller';
import { BuilderDNAService } from './builder-dna.service';
import { BuilderDNAController } from './builder-dna.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [EvolutionController, BuilderDNAController],
  providers: [EvolutionService, BuilderDNAService],
  exports: [EvolutionService, BuilderDNAService],
})
export class EcosystemModule {}
