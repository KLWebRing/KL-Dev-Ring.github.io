// ── KL DevVerse — Gameplay Module ────────────────────────────────────
// Wires all Developer Life Engine subsystems (Missions, Quests, Career, etc.)

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EconomyModule } from '../economy/economy.module';
import { BuilderModule } from '../builder/builder.module';
import { MissionService } from './mission.service';
import { MissionController } from './mission.controller';
import { QuestService } from './quest.service';
import { CareerService } from './career.service';

@Module({
  imports: [PrismaModule, EconomyModule, BuilderModule],
  controllers: [MissionController],
  providers: [MissionService, QuestService, CareerService],
  exports: [MissionService, QuestService, CareerService],
})
export class GameplayModule {}


