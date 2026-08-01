// ── KL DevVerse — Wallet Service ─────────────────────────────────────
// Manages all wallet currencies: Builder Cash, Reputation, Innovation Score.
// Every mutation creates an audit trail via WalletTransaction.
// Redis-cached reads with invalidation on writes.

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { CurrencyType, TransactionType } from '@prisma/client';

// ── Daily Reward Schedule ────────────────────────────────────────────

const DAILY_REWARDS = [
  { day: 1, currency: 'BUILDER_CASH' as CurrencyType, amount: 25 },
  { day: 2, currency: 'BUILDER_CASH' as CurrencyType, amount: 35 },
  { day: 3, currency: 'BUILDER_CASH' as CurrencyType, amount: 50 },
  { day: 4, currency: 'BUILDER_CASH' as CurrencyType, amount: 50 },
  { day: 5, currency: 'BUILDER_CASH' as CurrencyType, amount: 75 },
  { day: 6, currency: 'BUILDER_CASH' as CurrencyType, amount: 75 },
  { day: 7, currency: 'BUILDER_CASH' as CurrencyType, amount: 150 },
];

const WALLET_CACHE_TTL = 5; // seconds
const WALLET_CACHE_PREFIX = 'wallet:';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Get Wallet ──────────────────────────────────────────────────────

  async getWallet(userId: string) {
    // Try cache first
    const cached = await this.redis.get(`${WALLET_CACHE_PREFIX}${userId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from DB (upsert ensures record exists)
    const progress = await this.prisma.builderProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const wallet = {
      builderCash: progress.builderCash,
      totalXp: progress.totalXp,
      level: progress.level,
      reputation: progress.reputation,
      innovationScore: progress.innovationScore,
      seasonTokens: progress.seasonTokens,
      studioValue: progress.studioValue,
      leaderboardRating: progress.leaderboardRating,
      prestigeLevel: progress.prestigeLevel,
      dailyLoginStreak: progress.dailyLoginStreak,
      lastLoginDate: progress.lastLoginDate,
    };

    // Cache
    await this.redis.set(
      `${WALLET_CACHE_PREFIX}${userId}`,
      JSON.stringify(wallet),
      WALLET_CACHE_TTL,
    );

    return wallet;
  }

  // ── Earn Currency ───────────────────────────────────────────────────

  async earnCash(userId: string, amount: number, source: string, description = '') {
    return this.modifyCurrency(userId, 'BUILDER_CASH', amount, 'EARN', source, description);
  }

  async earnReputation(userId: string, amount: number, source: string, description = '') {
    return this.modifyCurrency(userId, 'REPUTATION', amount, 'EARN', source, description);
  }

  async earnInnovation(userId: string, amount: number, source: string, description = '') {
    return this.modifyCurrency(userId, 'INNOVATION', amount, 'EARN', source, description);
  }

  async earnSeasonTokens(userId: string, amount: number, source: string, description = '') {
    return this.modifyCurrency(userId, 'SEASON_TOKEN', amount, 'EARN', source, description);
  }

  async earnXp(userId: string, amount: number, source: string, description = '') {
    return this.modifyCurrency(userId, 'XP', amount, 'EARN', source, description);
  }

  // ── Spend Currency ──────────────────────────────────────────────────

  async spendCash(userId: string, amount: number, source: string, description = '') {
    return this.modifyCurrency(userId, 'BUILDER_CASH', amount, 'SPEND', source, description);
  }

  // ── Core Currency Modifier ──────────────────────────────────────────

  private async modifyCurrency(
    userId: string,
    currency: CurrencyType,
    amount: number,
    type: TransactionType,
    source: string,
    description: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const progress = await this.prisma.builderProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const field = this.getCurrencyField(currency);
    const currentBalance = (progress as Record<string, number>)[field] ?? 0;
    const isSpend = type === 'SPEND';

    if (isSpend && currentBalance < amount) {
      throw new BadRequestException(
        `Insufficient ${currency}: have ${currentBalance}, need ${amount}`,
      );
    }

    const newBalance = isSpend ? currentBalance - amount : currentBalance + amount;

    // Atomic update + transaction log
    const [updated] = await this.prisma.$transaction([
      this.prisma.builderProgress.update({
        where: { userId },
        data: { [field]: newBalance },
      }),
      this.prisma.walletTransaction.create({
        data: {
          userId,
          type,
          currency,
          amount: isSpend ? -amount : amount,
          source,
          description,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
        },
      }),
    ]);

    // Invalidate cache
    await this.redis.del(`${WALLET_CACHE_PREFIX}${userId}`);

    this.logger.log(
      `Wallet ${type} for ${userId}: ${currency} ${isSpend ? '-' : '+'}${amount} (${currentBalance} → ${newBalance}) [${source}]`,
    );

    return {
      currency,
      previousBalance: currentBalance,
      newBalance,
      amount: isSpend ? -amount : amount,
      level: updated.level,
    };
  }

  // ── Daily Reward ────────────────────────────────────────────────────

  async claimDailyReward(userId: string) {
    const progress = await this.prisma.builderProgress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    // Check if already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (progress.lastLoginDate) {
      const lastLogin = new Date(progress.lastLoginDate);
      lastLogin.setHours(0, 0, 0, 0);

      if (lastLogin.getTime() === today.getTime()) {
        throw new BadRequestException('Daily reward already claimed today');
      }

      // Check if streak is broken (missed a day)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastLogin.getTime() < yesterday.getTime()) {
        // Streak broken — reset to day 1
        await this.prisma.builderProgress.update({
          where: { userId },
          data: { dailyLoginStreak: 0 },
        });
      }
    }

    // Calculate streak day (1-7, cycling)
    const newStreak = (progress.dailyLoginStreak % 7) + 1;
    const reward = DAILY_REWARDS[newStreak - 1]!;

    // Apply reward
    const result = await this.modifyCurrency(
      userId,
      reward.currency,
      reward.amount,
      'BONUS',
      'daily_reward',
      `Day ${newStreak} login reward`,
    );

    // Update streak and login date
    await this.prisma.builderProgress.update({
      where: { userId },
      data: {
        dailyLoginStreak: newStreak,
        lastLoginDate: new Date(),
      },
    });

    // Record in daily rewards table
    await this.prisma.dailyReward.create({
      data: {
        userId,
        day: newStreak,
        reward: JSON.stringify({ currency: reward.currency, amount: reward.amount }),
      },
    });

    return {
      streakDay: newStreak,
      reward: {
        currency: reward.currency,
        amount: reward.amount,
      },
      newBalance: result.newBalance,
    };
  }

  // ── Transaction History ─────────────────────────────────────────────

  async getTransactionHistory(userId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.walletTransaction.count({ where: { userId } }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private getCurrencyField(currency: CurrencyType): string {
    switch (currency) {
      case 'BUILDER_CASH': return 'builderCash';
      case 'XP': return 'totalXp';
      case 'REPUTATION': return 'reputation';
      case 'INNOVATION': return 'innovationScore';
      case 'SEASON_TOKEN': return 'seasonTokens';
    }
  }
}
