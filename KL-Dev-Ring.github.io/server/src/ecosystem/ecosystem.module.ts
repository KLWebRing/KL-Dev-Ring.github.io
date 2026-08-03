// ── KL DevVerse — Ecosystem Module ───────────────────────────────────
// Wires all Builder Ecosystem Engine services (Phase 7).

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EvolutionService } from './evolution.service';
import { EvolutionController } from './evolution.controller';
import { BuilderDNAService } from './builder-dna.service';
import { BuilderDNAController } from './builder-dna.controller';
import { ProjectPortalService } from './project-portal.service';
import { ProjectPortalController } from './project-portal.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [EvolutionController, BuilderDNAController, ProjectPortalController],
  providers: [EvolutionService, BuilderDNAService, ProjectPortalService],
  exports: [EvolutionService, BuilderDNAService, ProjectPortalService],
})
export class EcosystemModule {}
