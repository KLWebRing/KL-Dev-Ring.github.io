// ── KL DevVerse — Purchase Service ───────────────────────────────────
// Atomic purchase flow: validate → check balance → deduct → add to inventory.
// All in a Prisma $transaction for ACID guarantees.
// NEVER trusts client values.

import { Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WalletService } from './wallet.service';
import { InventoryService } from '../inventory/inventory.service';
import type { CurrencyType } from '@prisma/client';

@Injectable()
export class PurchaseService {
  private readonly logger = new Logger(PurchaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Purchase an item from the marketplace.
   * Fully atomic — either everything succeeds or nothing changes.
   */
  async purchaseItem(userId: string, marketplaceItemId: string) {
    // ── Step 1: Validate item exists ──────────────────────────────
    const item = await this.prisma.marketplaceItem.findUnique({
      where: { id: marketplaceItemId },
    });

    if (!item) {
      throw new NotFoundException('Marketplace item not found');
    }

    // ── Step 2: Check if limited and expired ──────────────────────
    if (item.isLimited && item.limitedUntil) {
      if (new Date() > new Date(item.limitedUntil)) {
        throw new BadRequestException('This limited item is no longer available');
      }
    }

    // ── Step 3: Check stock ───────────────────────────────────────
    if (item.stock !== null && item.stock <= 0) {
      throw new BadRequestException('This item is out of stock');
    }

    // ── Step 4: Check studio tier requirement ─────────────────────
    const studio = await this.prisma.builderStudio.findUnique({
      where: { userId },
      select: { tier: true },
    });

    if (studio && studio.tier < item.requiredTier) {
      throw new ForbiddenException(
        `This item requires Studio Tier ${item.requiredTier}. Your current tier: ${studio.tier}`,
      );
    }

    // ── Step 5: Check if already owned (for non-stackable items) ──
    const alreadyOwned = await this.inventoryService.ownsItem(userId, item.catalogId);
    if (alreadyOwned && item.category !== 'DECORATION') {
      // Decorations can be stacked, other items are unique
      throw new BadRequestException('You already own this item');
    }

    // ── Step 6: Check balance ─────────────────────────────────────
    const wallet = await this.walletService.getWallet(userId);
    const balance = this.getBalanceForCurrency(wallet, item.currency);

    if (balance < item.price) {
      throw new BadRequestException(
        `Insufficient ${item.currency}: have ${balance}, need ${item.price}`,
      );
    }

    // ── Step 7: Atomic transaction ────────────────────────────────
    const result = await this.prisma.$transaction(async (tx) => {
      // 7a: Deduct currency
      const currencyField = this.getCurrencyField(item.currency);
      const progress = await tx.builderProgress.update({
        where: { userId },
        data: { [currencyField]: { decrement: item.price } },
      });

      // 7b: Create transaction log
      await tx.walletTransaction.create({
        data: {
          userId,
          type: 'SPEND',
          currency: item.currency,
          amount: -item.price,
          source: 'marketplace_purchase',
          description: `Purchased: ${item.name}`,
          balanceBefore: balance,
          balanceAfter: balance - item.price,
        },
      });

      // 7c: Add to inventory
      await tx.inventoryItem.upsert({
        where: { userId_catalogId: { userId, catalogId: item.catalogId } },
        create: {
          userId,
          catalogId: item.catalogId,
          category: item.category,
          source: 'marketplace',
        },
        update: {
          quantity: { increment: 1 },
        },
      });

      // 7d: Record purchase history
      await tx.purchaseHistory.create({
        data: {
          userId,
          marketplaceItemId: item.id,
          price: item.price,
          currency: item.currency,
        },
      });

      // 7e: Decrement stock if limited
      if (item.stock !== null) {
        await tx.marketplaceItem.update({
          where: { id: item.id },
          data: { stock: { decrement: 1 } },
        });
      }

      return progress;
    });

    // ── Step 8: Invalidate caches ─────────────────────────────────
    await this.redis.del(`wallet:${userId}`);
    await this.redis.del(`marketplace:item:${marketplaceItemId}`);
    if (item.featured) await this.redis.del('marketplace:featured');
    await this.redis.del('marketplace:trending');

    this.logger.log(
      `Purchase complete: user=${userId} item="${item.name}" price=${item.price} ${item.currency}`,
    );

    return {
      success: true,
      item: {
        id: item.id,
        catalogId: item.catalogId,
        name: item.name,
        rarity: item.rarity,
      },
      cost: {
        price: item.price,
        currency: item.currency,
        newBalance: balance - item.price,
      },
    };
  }

  /**
   * Get purchase history for a user (paginated).
   */
  async getPurchaseHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [purchases, total] = await this.prisma.$transaction([
      this.prisma.purchaseHistory.findMany({
        where: { userId },
        include: {
          marketplaceItem: {
            select: { name: true, catalogId: true, rarity: true, category: true },
          },
        },
        orderBy: { purchasedAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.purchaseHistory.count({ where: { userId } }),
    ]);

    return {
      purchases,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private getBalanceForCurrency(wallet: Record<string, number>, currency: CurrencyType): number {
    switch (currency) {
      case 'BUILDER_CASH': return wallet.builderCash ?? 0;
      case 'XP': return wallet.totalXp ?? 0;
      case 'REPUTATION': return wallet.reputation ?? 0;
      case 'INNOVATION': return wallet.innovationScore ?? 0;
      case 'SEASON_TOKEN': return wallet.seasonTokens ?? 0;
      default: return 0;
    }
  }

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
