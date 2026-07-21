// ── KL DevVerse — Achievement Service ────────────────────────────────
// Data-driven achievement system. Unlock conditions are checked here.
// The catalog is the source of truth for what achievements exist.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BuilderService } from '../builder/builder.service';

/**
 * Achievement catalog IDs — mirrors the client-side achievementCatalog.ts.
 * Only IDs are needed server-side. The full metadata (name, icon, etc.)
 * lives in the client catalog for rendering.
 */
const ACHIEVEMENT_XP_REWARDS: Record<string, number> = {
  ach_account_created: 10,
  ach_first_login: 10,
  ach_profile_complete: 25,
  ach_explorer_1: 50,
  ach_explorer_2: 100,
  ach_house_visitor: 75,
  ach_socializer_1: 30,
  ach_socializer_2: 100,
  ach_socializer_3: 250,
  ach_chat_first: 15,
  ach_builder_1: 25,
  ach_builder_2: 75,
  ach_builder_3: 200,
  ach_wardrobe_1: 20,
  ach_project_showcase: 30,
  ach_github_linked: 50,
  ach_github_100_commits: 150,
  ach_github_streak_7: 100,
  ach_github_streak_30: 500,
  ach_special_early_adopter: 500,
};

@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly builderService: BuilderService,
  ) {}

  /**
   * Get all achievements for a user.
   */
  async getUserAchievements(userId: string) {
    return this.prisma.achievement.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  /**
   * Unlock an achievement for a user.
   * Idempotent — if already unlocked, returns existing.
   * Awards XP via BuilderService.
   */
  async unlock(userId: string, achieveId: string): Promise<{
    alreadyUnlocked: boolean;
    achievement: { achieveId: string; unlockedAt: Date; progress: number };
    xpAwarded: number;
  }> {
    // Check if already unlocked
    const existing = await this.prisma.achievement.findUnique({
      where: { userId_achieveId: { userId, achieveId } },
    });

    if (existing) {
      return {
        alreadyUnlocked: true,
        achievement: existing,
        xpAwarded: 0,
      };
    }

    // Unlock
    const achievement = await this.prisma.achievement.create({
      data: {
        userId,
        achieveId,
        progress: 100,
      },
    });

    // Award XP
    const xpReward = ACHIEVEMENT_XP_REWARDS[achieveId] ?? 0;
    if (xpReward > 0) {
      await this.builderService.awardXp(userId, xpReward, 'building');
    }

    this.logger.log(`Achievement unlocked: ${achieveId} for user ${userId} (+${xpReward} XP)`);

    return {
      alreadyUnlocked: false,
      achievement,
      xpAwarded: xpReward,
    };
  }

  /**
   * Update progress on a progressive achievement.
   * Auto-unlocks when progress reaches maxProgress.
   */
  async updateProgress(userId: string, achieveId: string, currentProgress: number, maxProgress: number): Promise<{
    unlocked: boolean;
    progress: number;
  }> {
    const progressPercent = Math.min(Math.round((currentProgress / maxProgress) * 100), 100);

    if (progressPercent >= 100) {
      const result = await this.unlock(userId, achieveId);
      return { unlocked: !result.alreadyUnlocked, progress: 100 };
    }

    // Upsert progress
    await this.prisma.achievement.upsert({
      where: { userId_achieveId: { userId, achieveId } },
      create: {
        userId,
        achieveId,
        progress: progressPercent,
      },
      update: {
        progress: progressPercent,
      },
    });

    return { unlocked: false, progress: progressPercent };
  }

  /**
   * Get achievement count summary.
   */
  async getStats(userId: string) {
    const total = Object.keys(ACHIEVEMENT_XP_REWARDS).length;
    const unlocked = await this.prisma.achievement.count({
      where: { userId, progress: 100 },
    });
    const inProgress = await this.prisma.achievement.count({
      where: { userId, progress: { lt: 100 } },
    });

    return { total, unlocked, inProgress, locked: total - unlocked - inProgress };
  }
}
