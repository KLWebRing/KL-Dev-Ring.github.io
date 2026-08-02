// ── KL DevVerse — Gameplay Module ────────────────────────────────────
// Wires all Developer Life Engine subsystems.

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
import { SkillTreeService } from './skill-tree.service';
import { SkillTreeController } from './skill-tree.controller';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';

@Module({
  imports: [PrismaModule, RedisModule, EconomyModule, BuilderModule],
  controllers: [
    MissionController,
    QuestController,
    CareerController,
    ReputationController,
    SkillTreeController,
    TimelineController,
    LeaderboardController,
    ActivityController,
  ],
  providers: [
    MissionService,
    QuestService,
    CareerService,
    ReputationService,
    SkillTreeService,
    TimelineService,
    LeaderboardService,
    ActivityService,
  ],
  exports: [
    MissionService,
    QuestService,
    CareerService,
    ReputationService,
    SkillTreeService,
    TimelineService,
    LeaderboardService,
    ActivityService,
  ],
})
export class GameplayModule {}
