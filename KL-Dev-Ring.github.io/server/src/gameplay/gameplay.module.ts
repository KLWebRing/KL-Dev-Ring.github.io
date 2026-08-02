// ── KL DevVerse — Gameplay Module ────────────────────────────────────
// Wires all Developer Life Engine subsystems (Missions, Quests, Career, etc.)

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EconomyModule } from '../economy/economy.module';
import { BuilderModule } from '../builder/builder.module';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { QuestService } from './quest.service';
import { QuestController } from './quest.controller';
import { CareerService } from './career.service';
import { CareerController } from './career.controller';
import { ReputationService } from './reputation.service';
import { ReputationController } from './reputation.controller';

@Module({
  imports: [PrismaModule, RedisModule, EconomyModule, BuilderModule],
  controllers: [MissionController, QuestController, CareerController, ReputationController],
  providers: [MissionService, QuestService, CareerService, ReputationService],
  exports: [MissionService, QuestService, CareerService, ReputationService],
})
export class GameplayModule {}
