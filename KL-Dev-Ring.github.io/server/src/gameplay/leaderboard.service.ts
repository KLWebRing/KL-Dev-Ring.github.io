// ── KL DevVerse — Leaderboard Service ────────────────────────────────
// Manages leaderboard rankings with Redis caching.
// Supports multiple board types (Level, Reputation, Innovation, etc.)

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const LEADERBOARD_CACHE_PREFIX = 'lb:';
const LEADERBOARD_CACHE_TTL = 300; // 5 minutes
const DEFAULT_PAGE_SIZE = 25;

type BoardType = 'LEVEL' | 'INNOVATION' | 'REPUTATION' | 'STUDIO_VALUE' | 'COMMUNITY' | 'SEASON';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Get leaderboard for a specific board type.
   * Results are Redis-cached for 5 minutes.
   */
  async getLeaderboard(board: BoardType, page: number = 1, limit: number = DEFAULT_PAGE_SIZE) {
    const cacheKey = `${LEADERBOARD_CACHE_PREFIX}${board}:${page}:${limit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const skip = (page - 1) * limit;
    const orderField = this.getOrderField(board);

    const [entries, total] = await Promise.all([
      this.prisma.builderProgress.findMany({
        where: { [orderField]: { gt: 0 } },
        orderBy: { [orderField]: 'desc' },
        skip,
        take: limit,
        select: {
          userId: true,
          [orderField]: true,
          level: true,
          careerTitle: true,
          builderRank: true,
          user: {
            select: { username: true, displayName: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.builderProgress.count({
        where: { [orderField]: { gt: 0 } },
      }),
    ]);

    const result = {
      board,
      entries: entries.map((e: any, idx: number) => ({
        rank: skip + idx + 1,
        userId: e.userId,
        username: e.user.username,
        displayName: e.user.displayName,
        avatarUrl: e.user.avatarUrl,
        score: e[orderField],
        level: e.level,
        careerTitle: e.careerTitle,
        builderRank: e.builderRank,
      })),
      page,
      totalPages: Math.ceil(total / limit),
      totalEntries: total,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), LEADERBOARD_CACHE_TTL);
    return result;
  }

  /**
   * Get a single user's rank on a specific board.
   */
  async getUserRank(userId: string, board: BoardType) {
    const orderField = this.getOrderField(board);
    const userProgress = await this.prisma.builderProgress.findUnique({
      where: { userId },
      select: { [orderField]: true },
    });

    if (!userProgress) return { rank: null, score: 0 };

    const score = (userProgress as any)[orderField] ?? 0;

    // Count how many users have a higher score
    const higherCount = await this.prisma.builderProgress.count({
      where: { [orderField]: { gt: score } },
    });

    return {
      rank: higherCount + 1,
      score,
      board,
    };
  }

  /**
   * Get user's rank across all board types.
   */
  async getUserRanks(userId: string) {
    const boards: BoardType[] = ['LEVEL', 'REPUTATION', 'INNOVATION', 'STUDIO_VALUE'];
    const ranks = await Promise.all(
      boards.map(async board => ({
        board,
        ...(await this.getUserRank(userId, board)),
      })),
    );
    return ranks;
  }

  private getOrderField(board: BoardType): string {
    switch (board) {
      case 'LEVEL': return 'totalXp';
      case 'INNOVATION': return 'innovationScore';
      case 'REPUTATION': return 'reputation';
      case 'STUDIO_VALUE': return 'studioValue';
      case 'COMMUNITY': return 'pointsFromSocial';
      case 'SEASON': return 'seasonTokens';
      default: return 'totalXp';
    }
  }
}
