// ── KL DevVerse — Achievement Module ─────────────────────────────────
import { Module } from '@nestjs/common';
import { AchievementService } from './achievement.service';
import { AchievementController } from './achievement.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BuilderModule } from '../builder/builder.module';

@Module({
  imports: [PrismaModule, BuilderModule],
  controllers: [AchievementController],
  providers: [AchievementService],
  exports: [AchievementService],
})
export class AchievementModule {}
