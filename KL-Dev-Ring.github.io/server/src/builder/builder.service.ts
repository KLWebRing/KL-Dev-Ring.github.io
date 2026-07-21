// ── KL DevVerse — Builder Service ────────────────────────────────────
// Manages builder progression: XP, leveling, point tracking.
// Pure service — no HTTP concerns.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** XP thresholds mirroring the client-side BUILDER_LEVELS constant */
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];

function computeLevel(totalXp: number): number {
  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (totalXp >= threshold) level++;
    else break;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

type PointSource = 'github' | 'social' | 'exploring' | 'building';

@Injectable()
export class BuilderService {
  private readonly logger = new Logger(BuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create the builder progress record for a user.
   */
  async getProgress(userId: string) {
    return this.prisma.builderProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  /**
   * Award XP to a user from a specific source.
   * Automatically recalculates level.
   */
  async awardXp(userId: string, amount: number, source: PointSource): Promise<{
    totalXp: number;
    level: number;
    leveledUp: boolean;
    previousLevel: number;
  }> {
    const current = await this.getProgress(userId);
    const previousLevel = current.level;
    const newTotalXp = current.totalXp + amount;
    const newLevel = computeLevel(newTotalXp);

    const sourceField = this.getSourceField(source);

    const updated = await this.prisma.builderProgress.update({
      where: { userId },
      data: {
        totalXp: newTotalXp,
        builderPoints: { increment: amount },
        level: newLevel,
        [sourceField]: { increment: amount },
      },
    });

    const leveledUp = newLevel > previousLevel;
    if (leveledUp) {
      this.logger.log(`User ${userId} leveled up: ${previousLevel} → ${newLevel}`);
    }

    return {
      totalXp: updated.totalXp,
      level: updated.level,
      leveledUp,
      previousLevel,
    };
  }

  /**
   * Get the formatted progress with next-level info.
   */
  async getFormattedProgress(userId: string) {
    const progress = await this.getProgress(userId);
    const nextThresholdIdx = LEVEL_THRESHOLDS.findIndex(t => t > progress.totalXp);
    const nextLevelXp = nextThresholdIdx >= 0
      ? LEVEL_THRESHOLDS[nextThresholdIdx]!
      : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]!;

    const currentThreshold = LEVEL_THRESHOLDS[progress.level - 1] ?? 0;
    const range = nextLevelXp - currentThreshold;
    const progressInLevel = progress.totalXp - currentThreshold;
    const progressPercent = range > 0 ? Math.min((progressInLevel / range) * 100, 100) : 100;

    return {
      ...progress,
      nextLevelXp,
      progressPercent: Math.round(progressPercent * 10) / 10,
    };
  }

  private getSourceField(source: PointSource): string {
    switch (source) {
      case 'github': return 'pointsFromGithub';
      case 'social': return 'pointsFromSocial';
      case 'exploring': return 'pointsFromExploring';
      case 'building': return 'pointsFromBuilding';
    }
  }
}
