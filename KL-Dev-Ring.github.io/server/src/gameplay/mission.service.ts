// ── KL DevVerse — Mission Service ────────────────────────────────────
// Handles available missions, progress tracking, and claiming rewards.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../economy/wallet.service';
import { BuilderService } from '../builder/builder.service';
import { MissionCategory, MissionState } from '@prisma/client';

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly builderService: BuilderService,
  ) {}

  /**
   * Get all missions available or active for a user.
   */
  async getMissions(userId: string) {
    const progressRecords = await this.prisma.missionProgress.findMany({
      where: { userId },
      include: {
        mission: true,
      },
    });

    const activeMissions = progressRecords.map((p) => ({
      ...p.mission,
      progressId: p.id,
      state: p.state,
      currentProgress: p.progress,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
    }));

    // Find available missions that the user hasn't started yet
    const builderProgress = await this.builderService.getProgress(userId);
    const existingMissionIds = progressRecords.map((p) => p.missionId);

    const availableMissions = await this.prisma.mission.findMany({
      where: {
        isActive: true,
        id: { notIn: existingMissionIds },
        minLevel: { lte: builderProgress.level },
        OR: [
          { endsAt: null },
          { endsAt: { gt: new Date() } }
        ]
      },
    });

    return {
      active: activeMissions,
      available: availableMissions.map(m => ({
        ...m,
        state: MissionState.AVAILABLE,
        currentProgress: 0
      }))
    };
  }

  /**
   * Start a mission.
   */
  async startMission(userId: string, missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) throw new NotFoundException('Mission not found');
    if (!mission.isActive) throw new BadRequestException('Mission is no longer active');
    if (mission.endsAt && mission.endsAt < new Date()) throw new BadRequestException('Mission has expired');

    const builderProgress = await this.builderService.getProgress(userId);
    if (mission.minLevel > builderProgress.level) {
      throw new BadRequestException(`Requires level ${mission.minLevel}`);
    }

    const existing = await this.prisma.missionProgress.findUnique({
      where: { userId_missionId: { userId, missionId } },
    });

    if (existing) {
      throw new BadRequestException('Mission already started');
    }

    const progress = await this.prisma.missionProgress.create({
      data: {
        userId,
        missionId,
        state: MissionState.ACTIVE,
        startedAt: new Date(),
      },
      include: { mission: true },
    });

    return progress;
  }

  /**
   * Update progress for a mission.
   */
  async updateProgress(userId: string, missionId: string, increment: number = 1) {
    const progress = await this.prisma.missionProgress.findUnique({
      where: { userId_missionId: { userId, missionId } },
      include: { mission: true },
    });

    if (!progress) throw new NotFoundException('Mission progress not found');
    if (progress.state !== MissionState.ACTIVE) throw new BadRequestException('Mission is not active');

    const newProgress = Math.min(progress.progress + increment, progress.mission.maxProgress);
    const isCompleted = newProgress >= progress.mission.maxProgress;

    const updated = await this.prisma.missionProgress.update({
      where: { id: progress.id },
      data: {
        progress: newProgress,
        state: isCompleted ? MissionState.COMPLETED : MissionState.ACTIVE,
        completedAt: isCompleted ? new Date() : null,
      },
      include: { mission: true },
    });

    if (isCompleted) {
      this.logger.log(`User ${userId} completed mission ${missionId}`);
    }

    return updated;
  }

  /**
   * Claim reward for a completed mission.
   */
  async claimReward(userId: string, missionId: string) {
    const progress = await this.prisma.missionProgress.findUnique({
      where: { userId_missionId: { userId, missionId } },
      include: { mission: true },
    });

    if (!progress) throw new NotFoundException('Mission progress not found');
    if (progress.state !== MissionState.COMPLETED) {
      throw new BadRequestException('Mission not completed or already claimed');
    }

    const { mission } = progress;

    // Atomically update state to REWARDED
    const updated = await this.prisma.missionProgress.update({
      where: { id: progress.id, state: MissionState.COMPLETED },
      data: {
        state: MissionState.REWARDED,
        rewardedAt: new Date(),
      },
    });

    if (!updated) {
       throw new BadRequestException('Failed to claim reward');
    }

    // Award rewards
    if (mission.cashReward > 0) {
      await this.walletService.earnCash(userId, mission.cashReward, 'mission', `Completed mission: ${mission.name}`);
    }
    if (mission.repReward > 0) {
      await this.walletService.earnReputation(userId, mission.repReward, 'MISSION', `Completed mission: ${mission.name}`);
    }
    if (mission.xpReward > 0) {
      // Assuming BuilderService handles XP
      await this.builderService.awardXp(userId, mission.xpReward, 'building');
    }

    // Parse additional JSON rewards if any
    let extraRewards = [];
    try {
      extraRewards = JSON.parse(mission.rewards);
    } catch (e) {
      this.logger.error(`Failed to parse mission rewards JSON: ${mission.rewards}`);
    }

    // Note: We'll implement extra reward logic (e.g. giving furniture) when inventory service is fully linked

    this.logger.log(`User ${userId} claimed reward for mission ${missionId}`);

    return {
      success: true,
      cashAwarded: mission.cashReward,
      repAwarded: mission.repReward,
      xpAwarded: mission.xpReward,
      extraRewards
    };
  }
}
