// ── KL DevVerse — Quest Service ────────────────────────────────────────
// Handles Daily/Weekly quest generation, progress tracking, and claiming.
// Quests are auto-generated per user and expire on schedule.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../economy/wallet.service';
import { BuilderService } from '../builder/builder.service';

// ── Quest Catalog ────────────────────────────────────────────────────
// Data-driven quest templates. The system picks from these each day/week.

const DAILY_QUEST_TEMPLATES = [
  { questId: 'dq_commit_code', name: 'Push Some Code', description: 'Make a GitHub commit today', targetAction: 'github_commit', targetCount: 1, xpReward: 25, cashReward: 15, repReward: 0 },
  { questId: 'dq_visit_studio', name: 'Studio Visit', description: 'Visit another builder\'s studio', targetAction: 'studio_visit', targetCount: 1, xpReward: 15, cashReward: 10, repReward: 5 },
  { questId: 'dq_explore_district', name: 'District Explorer', description: 'Explore a district in the world', targetAction: 'explore_district', targetCount: 1, xpReward: 20, cashReward: 10, repReward: 0 },
  { questId: 'dq_meet_developer', name: 'Networking', description: 'Visit 2 developer profiles', targetAction: 'meet_developer', targetCount: 2, xpReward: 20, cashReward: 15, repReward: 10 },
  { questId: 'dq_customize_studio', name: 'Interior Designer', description: 'Place or move furniture in your studio', targetAction: 'customize_studio', targetCount: 1, xpReward: 15, cashReward: 10, repReward: 0 },
  { questId: 'dq_review_project', name: 'Code Reviewer', description: 'View a project showcase', targetAction: 'project_view', targetCount: 3, xpReward: 30, cashReward: 20, repReward: 10 },
  { questId: 'dq_marketplace_browse', name: 'Window Shopping', description: 'Browse the marketplace', targetAction: 'marketplace_visit', targetCount: 1, xpReward: 10, cashReward: 5, repReward: 0 },
  { questId: 'dq_social_chat', name: 'Social Butterfly', description: 'Send a chat message', targetAction: 'chat_send', targetCount: 3, xpReward: 15, cashReward: 10, repReward: 5 },
  { questId: 'dq_multi_commit', name: 'Productive Day', description: 'Make 3 commits in one day', targetAction: 'github_commit', targetCount: 3, xpReward: 50, cashReward: 30, repReward: 0 },
  { questId: 'dq_attend_event', name: 'Event Goer', description: 'Join a community event', targetAction: 'event_join', targetCount: 1, xpReward: 30, cashReward: 20, repReward: 15 },
];

const WEEKLY_QUEST_TEMPLATES = [
  { questId: 'wq_commit_streak', name: 'Commit Streak', description: 'Make commits on 5 different days', targetAction: 'github_commit', targetCount: 5, xpReward: 100, cashReward: 75, repReward: 20 },
  { questId: 'wq_explore_all', name: 'World Traveler', description: 'Visit 5 different districts', targetAction: 'explore_district', targetCount: 5, xpReward: 80, cashReward: 50, repReward: 15 },
  { questId: 'wq_social_pro', name: 'Community Builder', description: 'Visit 10 studios', targetAction: 'studio_visit', targetCount: 10, xpReward: 120, cashReward: 80, repReward: 30 },
  { questId: 'wq_marketplace_buy', name: 'Smart Shopper', description: 'Make 3 marketplace purchases', targetAction: 'marketplace_purchase', targetCount: 3, xpReward: 75, cashReward: 0, repReward: 20 },
  { questId: 'wq_project_share', name: 'Show & Tell', description: 'Share 2 projects', targetAction: 'project_share', targetCount: 2, xpReward: 100, cashReward: 60, repReward: 25 },
];

const DAILY_QUEST_COUNT = 5;
const WEEKLY_QUEST_COUNT = 3;

@Injectable()
export class QuestService {
  private readonly logger = new Logger(QuestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly builderService: BuilderService,
  ) {}

  // ── Get Quests ─────────────────────────────────────────────────────

  /**
   * Get all active quests for a user.
   * Auto-generates daily/weekly quests if none exist or they've expired.
   */
  async getQuests(userId: string) {
    const now = new Date();

    // Ensure quests exist for this user
    await this.ensureDailyQuests(userId);
    await this.ensureWeeklyQuests(userId);

    const progressRecords = await this.prisma.questProgress.findMany({
      where: {
        userId,
        expiresAt: { gt: now },
      },
      include: { quest: true },
      orderBy: { expiresAt: 'asc' },
    });

    return {
      daily: progressRecords.filter(p => p.quest.type === 'DAILY').map(this.formatQuest),
      weekly: progressRecords.filter(p => p.quest.type === 'WEEKLY').map(this.formatQuest),
    };
  }

  // ── Quest Generation ───────────────────────────────────────────────

  /**
   * Ensure user has daily quests for today. If not, pick random ones.
   */
  private async ensureDailyQuests(userId: string) {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for active daily quests
    const existingCount = await this.prisma.questProgress.count({
      where: {
        userId,
        expiresAt: { gt: now },
        quest: { type: 'DAILY' },
      },
    });

    if (existingCount >= DAILY_QUEST_COUNT) return;

    // Generate new daily quests — pick random templates
    const shuffled = [...DAILY_QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
    const toGenerate = shuffled.slice(0, DAILY_QUEST_COUNT - existingCount);

    for (const template of toGenerate) {
      // Upsert the quest definition (idempotent)
      const quest = await this.prisma.quest.upsert({
        where: { questId: template.questId },
        create: {
          questId: template.questId,
          type: 'DAILY',
          name: template.name,
          description: template.description,
          targetAction: template.targetAction,
          targetCount: template.targetCount,
          xpReward: template.xpReward,
          cashReward: template.cashReward,
          repReward: template.repReward,
        },
        update: {},
      });

      // Create progress for this user (today's instance)
      await this.prisma.questProgress.create({
        data: {
          userId,
          questId: quest.id,
          expiresAt: endOfDay,
        },
      }).catch(() => {
        // Unique constraint violation — quest already assigned for this window
      });
    }
  }

  /**
   * Ensure user has weekly quests. Expire at end of current week (Sunday).
   */
  private async ensureWeeklyQuests(userId: string) {
    const now = new Date();
    const endOfWeek = new Date(now);
    const daysUntilSunday = 7 - endOfWeek.getDay();
    endOfWeek.setDate(endOfWeek.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    const existingCount = await this.prisma.questProgress.count({
      where: {
        userId,
        expiresAt: { gt: now },
        quest: { type: 'WEEKLY' },
      },
    });

    if (existingCount >= WEEKLY_QUEST_COUNT) return;

    const shuffled = [...WEEKLY_QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
    const toGenerate = shuffled.slice(0, WEEKLY_QUEST_COUNT - existingCount);

    for (const template of toGenerate) {
      const quest = await this.prisma.quest.upsert({
        where: { questId: template.questId },
        create: {
          questId: template.questId,
          type: 'WEEKLY',
          name: template.name,
          description: template.description,
          targetAction: template.targetAction,
          targetCount: template.targetCount,
          xpReward: template.xpReward,
          cashReward: template.cashReward,
          repReward: template.repReward,
        },
        update: {},
      });

      await this.prisma.questProgress.create({
        data: {
          userId,
          questId: quest.id,
          expiresAt: endOfWeek,
        },
      }).catch(() => { /* already assigned */ });
    }
  }

  // ── Track Action ───────────────────────────────────────────────────

  /**
   * Track an action and increment matching quest progress.
   * Called by ActivityService whenever a tracked action occurs.
   */
  async trackAction(userId: string, action: string, increment: number = 1) {
    const now = new Date();

    const activeQuests = await this.prisma.questProgress.findMany({
      where: {
        userId,
        completed: false,
        expiresAt: { gt: now },
        quest: { targetAction: action, isActive: true },
      },
      include: { quest: true },
    });

    if (activeQuests.length === 0) return { updated: 0, completed: 0 };

    let completedCount = 0;

    // Batch all updates into a transaction for consistency
    const updates = activeQuests.map(p => {
      const newCount = Math.min(p.currentCount + increment, p.quest.targetCount);
      const isCompleted = newCount >= p.quest.targetCount;
      if (isCompleted) completedCount++;

      return this.prisma.questProgress.update({
        where: { id: p.id },
        data: {
          currentCount: newCount,
          completed: isCompleted,
        },
      });
    });

    await this.prisma.$transaction(updates);

    if (completedCount > 0) {
      this.logger.log(`User ${userId} completed ${completedCount} quest(s) via action "${action}"`);
    }

    return { updated: activeQuests.length, completed: completedCount };
  }

  // ── Claim Reward ───────────────────────────────────────────────────

  /**
   * Claim reward for a completed quest. Validates ownership and state.
   */
  async claimReward(userId: string, progressId: string) {
    const progress = await this.prisma.questProgress.findUnique({
      where: { id: progressId },
      include: { quest: true },
    });

    if (!progress) throw new NotFoundException('Quest progress not found');
    if (progress.userId !== userId) throw new BadRequestException('Not your quest');
    if (!progress.completed) throw new BadRequestException('Quest not completed yet');
    if (progress.claimed) throw new BadRequestException('Already claimed');

    // Atomically mark as claimed (optimistic lock via where clause)
    await this.prisma.questProgress.update({
      where: { id: progress.id, claimed: false },
      data: { claimed: true, claimedAt: new Date() },
    });

    const { quest } = progress;

    // Award all rewards
    if (quest.cashReward > 0) {
      await this.walletService.earnCash(userId, quest.cashReward, 'quest', `Completed quest: ${quest.name}`);
    }
    if (quest.repReward > 0) {
      await this.walletService.earnReputation(userId, quest.repReward, 'quest', `Completed quest: ${quest.name}`);
    }
    if (quest.xpReward > 0) {
      await this.builderService.awardXp(userId, quest.xpReward, 'building');
    }

    this.logger.log(`User ${userId} claimed quest reward: ${quest.name}`);

    return {
      success: true,
      questName: quest.name,
      cashAwarded: quest.cashReward,
      repAwarded: quest.repReward,
      xpAwarded: quest.xpReward,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────

  private formatQuest(p: any) {
    return {
      id: p.id,
      questId: p.quest.questId,
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
