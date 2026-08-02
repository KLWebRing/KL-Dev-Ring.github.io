// ── KL DevVerse — Activity Service ───────────────────────────────────
// Logs player actions and auto-triggers quest progress.
// Central hub that connects user actions to the quest/mission systems.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestService } from './quest.service';
import type { ActionType } from '@prisma/client';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly questService: QuestService,
  ) {}

  /**
   * Log an activity and auto-trigger quest progress.
   * This is the central entry point — all game systems call this.
   */
  async logActivity(
    userId: string,
    action: ActionType,
    metadata: Record<string, unknown> = {},
  ) {
    // Create activity log entry
    const entry = await this.prisma.activityLog.create({
      data: {
        userId,
        action,
        metadata: JSON.stringify(metadata),
      },
    });

    // Auto-trigger quest progress for matching actions
    const questAction = this.mapActionToQuestAction(action);
    if (questAction) {
      await this.questService.trackAction(userId, questAction, 1).catch(err => {
        this.logger.warn(`Quest tracking failed for ${userId}/${questAction}: ${err.message}`);
      });
    }

    return entry;
  }

  /**
   * Get activity summary for a user.
   */
  async getActivitySummary(userId: string) {
    const byAction = await this.prisma.activityLog.groupBy({
      by: ['action'],
      where: { userId },
      _count: true,
    });

    const totalActions = byAction.reduce((sum, a) => sum + a._count, 0);

    // Get recent session count (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = await this.prisma.activityLog.count({
      where: {
        userId,
        action: 'SESSION_START',
        createdAt: { gte: sevenDaysAgo },
      },
    });

    return {
      totalActions,
      recentSessions,
      breakdown: byAction.map(a => ({
        action: a.action,
        count: a._count,
      })),
    };
  }

  /**
   * Get recent activity for a user.
   */
  async getRecentActivity(userId: string, limit: number = 20) {
    const entries = await this.prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return entries.map(e => {
      let parsedMeta = {};
      try { parsedMeta = JSON.parse(e.metadata); } catch { /* keep empty */ }
      return {
        id: e.id,
        action: e.action,
        metadata: parsedMeta,
        createdAt: e.createdAt,
      };
    });
  }

  /**
   * Map ActionType to quest targetAction string.
   */
  private mapActionToQuestAction(action: ActionType): string | null {
    const map: Partial<Record<ActionType, string>> = {
      EXPLORE: 'explore_district',
      STUDIO_VISIT: 'studio_visit',
      PROJECT_VIEW: 'project_view',
      PROJECT_SHARE: 'project_share',
      FURNITURE_PLACE: 'customize_studio',
      EVENT_JOIN: 'event_join',
      MARKETPLACE_PURCHASE: 'marketplace_purchase',
    };
    return map[action] ?? null;
  }
}
