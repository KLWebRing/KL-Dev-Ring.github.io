// ── KL DevVerse — Studio Upgrade Service ─────────────────────────────
// Handles studio tier progression.
// Validates requirements, deducts cost, upgrades tier.
// Recalculates studio value.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WalletService } from './wallet.service';
import { PricingEngine, STUDIO_UPGRADE_COSTS } from './pricing.engine';

const MAX_STUDIO_TIER = 6;

// ── Tier Definitions ────────────────────────────────────────────────

export const STUDIO_TIER_INFO = [
  { tier: 1, name: 'Garage Workspace',       rooms: 1, slots: 5,  projectSlots: 2,  maxVisitors: 3 },
  { tier: 2, name: 'Professional Workspace',  rooms: 2, slots: 10, projectSlots: 3,  maxVisitors: 5 },
  { tier: 3, name: 'Innovation Lab',          rooms: 3, slots: 18, projectSlots: 4,  maxVisitors: 8 },
  { tier: 4, name: 'Startup Office',          rooms: 4, slots: 25, projectSlots: 5,  maxVisitors: 12 },
  { tier: 5, name: 'Technology Campus',        rooms: 6, slots: 35, projectSlots: 6,  maxVisitors: 20 },
  { tier: 6, name: 'Innovation Headquarters',  rooms: 8, slots: 50, projectSlots: 8,  maxVisitors: 50 },
];

@Injectable()
export class StudioUpgradeService {
  private readonly logger = new Logger(StudioUpgradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
  ) {}

  // ── Get Upgrade Info ────────────────────────────────────────────

  async getUpgradeInfo(userId: string) {
    const studio = await this.prisma.builderStudio.findUnique({
      where: { userId },
      select: { tier: true, id: true },
    });

    if (!studio) {
      throw new NotFoundException('Builder Studio not found');
    }

    const currentTierInfo = STUDIO_TIER_INFO[studio.tier - 1];
    const nextTierInfo = studio.tier < MAX_STUDIO_TIER ? STUDIO_TIER_INFO[studio.tier] : null;
    const upgradeCost = PricingEngine.getUpgradeCost(studio.tier);

    const wallet = await this.walletService.getWallet(userId);

    return {
      currentTier: studio.tier,
      currentTierName: currentTierInfo?.name ?? 'Unknown',
      currentTierInfo,
      nextTier: nextTierInfo ? studio.tier + 1 : null,
      nextTierName: nextTierInfo?.name ?? null,
      nextTierInfo,
      upgradeCost,
      canAfford: upgradeCost !== null ? wallet.builderCash >= upgradeCost : false,
      isMaxTier: studio.tier >= MAX_STUDIO_TIER,
    };
  }

  // ── Upgrade Studio ──────────────────────────────────────────────

  async upgradeStudio(userId: string) {
    const studio = await this.prisma.builderStudio.findUnique({
      where: { userId },
      include: { _count: { select: { furniture: true } } },
    });

    if (!studio) {
      throw new NotFoundException('Builder Studio not found');
    }

    if (studio.tier >= MAX_STUDIO_TIER) {
      throw new BadRequestException('Studio is already at maximum tier');
    }

    const cost = STUDIO_UPGRADE_COSTS[studio.tier];
    if (!cost) {
      throw new BadRequestException('Invalid tier for upgrade');
    }

    // Deduct cost (will throw if insufficient)
    await this.walletService.spendCash(
      userId,
      cost,
      'studio_upgrade',
      `Studio upgrade: Tier ${studio.tier} → ${studio.tier + 1}`,
    );

    // Upgrade tier
    const newTier = studio.tier + 1;
    const newStudioValue = PricingEngine.calculateStudioValue(
      newTier,
      studio._count.furniture,
    );

    await this.prisma.$transaction([
      this.prisma.builderStudio.update({
        where: { userId },
        data: { tier: newTier },
      }),
      this.prisma.builderProgress.update({
        where: { userId },
        data: { studioValue: newStudioValue },
      }),
    ]);

    // Invalidate caches
    await this.redis.del(`wallet:${userId}`);

    const tierInfo = STUDIO_TIER_INFO[newTier - 1];

    this.logger.log(
      `Studio upgraded: user=${userId} tier=${studio.tier}→${newTier} cost=${cost}`,
    );

    return {
      success: true,
      previousTier: studio.tier,
      newTier,
      tierName: tierInfo?.name ?? 'Unknown',
      cost,
      studioValue: newStudioValue,
      unlocks: {
        rooms: tierInfo?.rooms ?? 0,
        furnitureSlots: tierInfo?.slots ?? 0,
        projectSlots: tierInfo?.projectSlots ?? 0,
        maxVisitors: tierInfo?.maxVisitors ?? 0,
      },
    };
  }
}
