// ── KL DevVerse — Quest Service ────────────────────────────────────────
// Handles tracking actions for Daily and Weekly quests.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../economy/wallet.service';
import { BuilderService } from '../builder/builder.service';
import { QuestType } from '@prisma/client';

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly builderService: BuilderService,
  ) {}

  /**
   * Get all active quests for a user (Daily and Weekly).
   * Generates new ones if they are missing or expired.
   */
  async getQuests(userId: string) {
    const now = new Date();
    
    const progressRecords = await this.prisma.questProgress.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
      },
      include: { quest: true },
    });

    // Separate by type
    const dailyQuests = progressRecords.filter(p => p.quest.type === QuestType.DAILY);
    const weeklyQuests = progressRecords.filter(p => p.quest.type === QuestType.WEEKLY);

    // Note: In a production system, we'd have a cron job or generation logic here
    // to assign new quests if the user doesn't have enough active ones.
    // For now, we return what's there.

    return {
      daily: dailyQuests.map(this.formatQuest),
      weekly: weeklyQuests.map(this.formatQuest),
    };
  }

  /**
   * Track an action to progress active quests.
   * Typically called by ActivityService.
   */
  async trackAction(userId: string, action: string, increment: number = 1) {
    const now = new Date();

    const activeQuests = await this.prisma.questProgress.findMany({
      where: {
        userId,
        completed: false,
        expiresAt: { gt: now },
        quest: {
          targetAction: action,
          isActive: true,
        }
      },
      include: { quest: true },
    });

    if (activeQuests.length === 0) return { updated: 0 };

    let completedCount = 0;

    for (const p of activeQuests) {
      const newCount = Math.min(p.currentCount + increment, p.quest.targetCount);
      const isCompleted = newCount >= p.quest.targetCount;

      await this.prisma.questProgress.update({
        where: { id: p.id },
        data: {
          currentCount: newCount,
          completed: isCompleted,
        },
      });

      if (isCompleted) {
        completedCount++;
        this.logger.log(`User ${userId} completed quest ${p.quest.id}`);
      }
    }

    return { updated: activeQuests.length, completed: completedCount };
  }

  /**
   * Claim reward for a completed quest.
   */
  async claimReward(userId: string, progressId: string) {
    const progress = await this.prisma.questProgress.findUnique({
      where: { id: progressId },
      include: { quest: true },
    });

    if (!progress) throw new NotFoundException('Quest progress not found');
    if (progress.userId !== userId) throw new BadRequestException('Not your quest');
    if (!progress.completed) throw new BadRequestException('Quest not completed');
    if (progress.claimed) throw new BadRequestException('Already claimed');

    // Mark as claimed
    const updated = await this.prisma.questProgress.update({
      where: { id: progress.id, claimed: false },
      data: {
        claimed: true,
        claimedAt: new Date(),
      },
    });

    if (!updated) throw new BadRequestException('Failed to claim');

    const { quest } = progress;

    // Award rewards
    if (quest.cashReward > 0) {
      await this.walletService.earnCash(userId, quest.cashReward, 'quest', `Completed quest: ${quest.name}`);
    }
    if (quest.repReward > 0) {
      await this.walletService.earnReputation(userId, quest.repReward, 'SYSTEM', `Completed quest: ${quest.name}`);
    }
    if (quest.xpReward > 0) {
      await this.builderService.awardXp(userId, quest.xpReward, 'building');
    }

    this.logger.log(`User ${userId} claimed quest ${quest.id}`);

    return {
      success: true,
      cashAwarded: quest.cashReward,
      repAwarded: quest.repReward,
      xpAwarded: quest.xpReward,
    };
  }

  private formatQuest(p: any) {
    return {
      id: p.id,
      questId: p.questId,
      name: p.quest.name,
      description: p.quest.description,
      type: p.quest.type,
      targetAction: p.quest.targetAction,
      currentCount: p.currentCount,
      targetCount: p.quest.targetCount,
      completed: p.completed,
      claimed: p.claimed,
      expiresAt: p.expiresAt,
      cashReward: p.quest.cashReward,
      xpReward: p.quest.xpReward,
      repReward: p.quest.repReward,
    };
  }
}
