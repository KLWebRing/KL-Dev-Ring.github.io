// ── KL DevVerse — Reputation Service ─────────────────────────────────
// Manages reputation: awarding, history, and leaderboard data.
// Reputation cannot be purchased — only earned through meaningful activity.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../economy/wallet.service';
import { RedisService } from '../redis/redis.service';
import type { ReputationSource } from '@prisma/client';

const REP_CACHE_PREFIX = 'rep:';
const REP_CACHE_TTL = 30; // seconds

@Injectable()
export class ReputationService {
  private readonly logger = new Logger(ReputationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly redis: RedisService,
  ) {}

  // ── Award Reputation ───────────────────────────────────────────────

  /**
   * Award reputation to a user from a specific source.
   * Creates an audit trail in ReputationHistory.
   * Updates the wallet reputation balance via WalletService.
   */
  async awardReputation(
    userId: string,
    amount: number,
    source: ReputationSource,
    description: string,
    givenByUserId?: string,
  ) {
    if (amount <= 0) {
      this.logger.warn(`Attempted to award non-positive reputation: ${amount}`);
      return null;
    }

    // Create history record
    const entry = await this.prisma.reputationHistory.create({
      data: {
        userId,
        amount,
        source,
        description,
        givenBy: givenByUserId ?? null,
      },
    });

    // Update wallet reputation balance
    await this.walletService.earnReputation(userId, amount, source, description);

    // Invalidate cache
    await this.redis.del(`${REP_CACHE_PREFIX}${userId}`);

    this.logger.log(
      `Reputation +${amount} for ${userId} [${source}]: ${description}` +
      (givenByUserId ? ` (from ${givenByUserId})` : ''),
    );

    return entry;
  }

  // ── Get History ────────────────────────────────────────────────────

  /**
   * Get paginated reputation history for a user.
   */
  async getHistory(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.reputationHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reputationHistory.count({ where: { userId } }),
    ]);

    return {
      entries,
      page,
      totalPages: Math.ceil(total / limit),
      total,
    };
  }

  // ── Get Summary ────────────────────────────────────────────────────

  /**
   * Get reputation summary with source breakdown.
   * Redis-cached for 30 seconds.
   */
  async getSummary(userId: string) {
    const cacheKey = `${REP_CACHE_PREFIX}${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const progress = await this.prisma.builderProgress.findUnique({
      where: { userId },
      select: { reputation: true },
    });

    // Group by source
    const sourceBreakdown = await this.prisma.reputationHistory.groupBy({
      by: ['source'],
      where: { userId },
      _sum: { amount: true },
      _count: true,
    });

    const summary = {
      totalReputation: progress?.reputation ?? 0,
      breakdown: sourceBreakdown.map(s => ({
        source: s.source,
        total: s._sum.amount ?? 0,
        count: s._count,
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(summary), REP_CACHE_TTL);
    return summary;
  }

  // ── Top Contributors ───────────────────────────────────────────────

  /**
   * Get top reputation holders. Used for leaderboard data.
   */
  async getTopContributors(limit: number = 25) {
    return this.prisma.builderProgress.findMany({
      where: { reputation: { gt: 0 } },
      orderBy: { reputation: 'desc' },
      take: limit,
      select: {
        userId: true,
        reputation: true,
        careerTitle: true,
        level: true,
        user: {
          select: { username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }
}
