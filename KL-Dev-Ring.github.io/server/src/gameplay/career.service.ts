// ── KL DevVerse — Career Service ─────────────────────────────────────────
// Manages Builder Career progression, ranks, and milestones.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const RANK_TIERS = [
  { rank: 1, title: 'Beginner', requiredXp: 0, requiredMissions: 0 },
  { rank: 2, title: 'Junior Builder', requiredXp: 1000, requiredMissions: 5 },
  { rank: 3, title: 'Mid-Level Builder', requiredXp: 3000, requiredMissions: 15 },
  { rank: 4, title: 'Senior Builder', requiredXp: 6000, requiredMissions: 30 },
  { rank: 5, title: 'Staff Builder', requiredXp: 10000, requiredMissions: 50 },
  { rank: 6, title: 'Principal Builder', requiredXp: 15000, requiredMissions: 75 },
  { rank: 7, title: 'Distinguished Builder', requiredXp: 25000, requiredMissions: 100 },
  { rank: 8, title: 'Fellow', requiredXp: 40000, requiredMissions: 150 },
  { rank: 9, title: 'Legend', requiredXp: 75000, requiredMissions: 250 },
];

@Injectable()
export class CareerService {
  private readonly logger = new Logger(CareerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get career state for a user.
   */
  async getCareer(userId: string) {
    const career = await this.prisma.builderCareer.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const milestones = await this.prisma.careerMilestone.findMany({
      where: { userId },
      orderBy: { achievedAt: 'desc' },
    });

    const progress = await this.prisma.builderProgress.findUnique({
      where: { userId },
    });

    // Determine current rank object
    const currentTier = RANK_TIERS.find(t => t.rank === progress?.builderRank) || RANK_TIERS[0];
    const nextTier = RANK_TIERS.find(t => t.rank === (progress?.builderRank || 1) + 1);

    return {
      career,
      milestones,
      rankDetails: {
        current: currentTier,
        next: nextTier,
        progress: progress,
      }
    };
  }

  /**
   * Recalculate rank based on XP and completed missions.
   * Typically called when a mission is completed or XP is gained.
   */
  async updateRank(userId: string) {
    const progress = await this.prisma.builderProgress.findUnique({ where: { userId } });
    const career = await this.prisma.builderCareer.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    if (!progress) return;

    let newRank = 1;
    let newTitle = 'Beginner';

    // Find the highest eligible rank
    for (const tier of RANK_TIERS) {
      if (
        progress.totalXp >= tier.requiredXp &&
        career.totalMissionsCompleted >= tier.requiredMissions
      ) {
        newRank = tier.rank;
        newTitle = tier.title;
      }
    }

    if (newRank > progress.builderRank) {
      // Rank Up!
      await this.prisma.builderProgress.update({
        where: { userId },
        data: { builderRank: newRank, careerTitle: newTitle },
      });

      // Record milestone
      await this.prisma.careerMilestone.create({
        data: {
          userId,
          milestoneId: `rank_up_${newRank}`,
          name: `Promoted to ${newTitle}`,
          description: `Reached Career Rank ${newRank}`,
        },
      });

      // Update timeline
      await this.prisma.timelineEntry.create({
        data: {
          userId,
          entryType: 'RANK_UP',
          title: `Promoted to ${newTitle}`,
          metadata: JSON.stringify({ rank: newRank }),
        },
      });

      this.logger.log(`User ${userId} ranked up to ${newTitle}`);
    }
  }

  /**
   * Log a completed mission/project for career advancement.
   */
  async logCareerAction(userId: string, type: 'mission' | 'quest' | 'project') {
    const career = await this.prisma.builderCareer.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const updateData: any = {};
    if (type === 'mission') updateData.totalMissionsCompleted = career.totalMissionsCompleted + 1;
    if (type === 'quest') updateData.totalQuestsCompleted = career.totalQuestsCompleted + 1;
    if (type === 'project') updateData.totalProjectsShipped = career.totalProjectsShipped + 1;

    await this.prisma.builderCareer.update({
      where: { userId },
      data: updateData,
    });

    // Check if this action triggers a rank up
    await this.updateRank(userId);
  }
}
