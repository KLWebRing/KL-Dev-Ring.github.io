// ── KL DevVerse — Pricing Engine ─────────────────────────────────────
// Centralized pricing rules for marketplace items.
// Rarity-based floor/ceiling, dynamic pricing for limited items.

import type { ItemRarity } from '@prisma/client';

// ── Rarity Price Ranges ─────────────────────────────────────────────

interface PriceRange {
  readonly floor: number;
  readonly ceiling: number;
  /** Default price if not explicitly set */
  readonly defaultPrice: number;
}

export const RARITY_PRICES: Record<string, PriceRange> = {
  COMMON:              { floor: 10,    ceiling: 100,    defaultPrice: 25 },
  UNCOMMON:            { floor: 50,    ceiling: 300,    defaultPrice: 100 },
  RARE:                { floor: 200,   ceiling: 1000,   defaultPrice: 400 },
  EPIC:                { floor: 800,   ceiling: 3000,   defaultPrice: 1500 },
  LEGENDARY:           { floor: 3000,  ceiling: 15000,  defaultPrice: 5000 },
  FOUNDER:             { floor: 5000,  ceiling: 50000,  defaultPrice: 10000 },
  SEASONAL:            { floor: 100,   ceiling: 5000,   defaultPrice: 500 },
  DEVELOPER_EXCLUSIVE: { floor: 2000,  ceiling: 25000,  defaultPrice: 3000 },
};

// ── Studio Tier Upgrade Costs ───────────────────────────────────────

export const STUDIO_UPGRADE_COSTS: Record<number, number> = {
  // currentTier → cost to upgrade to next tier
  1: 500,
  2: 2000,
  3: 8000,
  4: 25000,
  5: 75000,
};

// ── Pricing Engine ──────────────────────────────────────────────────

export class PricingEngine {
  /**
   * Validate that a price is within the acceptable range for a rarity.
   */
  static validatePrice(price: number, rarity: ItemRarity): boolean {
    const range = RARITY_PRICES[rarity];
    if (!range) return false;
    return price >= range.floor && price <= range.ceiling;
  }

  /**
   * Get the default price for a rarity.
   */
  static getDefaultPrice(rarity: ItemRarity): number {
    return RARITY_PRICES[rarity]?.defaultPrice ?? 50;
  }

  /**
   * Calculate dynamic price for limited items based on remaining stock.
   * As stock decreases, price increases (scarcity premium).
   */
  static calculateDynamicPrice(
    basePrice: number,
    currentStock: number | null,
    originalStock: number | null,
  ): number {
    if (currentStock === null || originalStock === null || originalStock === 0) {
      return basePrice;
    }

    const stockRatio = currentStock / originalStock;

    if (stockRatio <= 0.1) {
      // Last 10% — 2x premium
      return Math.round(basePrice * 2.0);
    }
    if (stockRatio <= 0.25) {
      // Last 25% — 1.5x premium
      return Math.round(basePrice * 1.5);
    }
    if (stockRatio <= 0.5) {
      // Last 50% — 1.2x premium
      return Math.round(basePrice * 1.2);
    }

    return basePrice;
  }

  /**
   * Get the studio upgrade cost for a given tier.
   * Returns null if at max tier.
   */
  static getUpgradeCost(currentTier: number): number | null {
    return STUDIO_UPGRADE_COSTS[currentTier] ?? null;
  }

  /**
   * Calculate studio value based on tier and furniture count.
   */
  static calculateStudioValue(tier: number, furnitureCount: number): number {
    const tierValue = Object.entries(STUDIO_UPGRADE_COSTS)
      .filter(([t]) => parseInt(t) < tier)
      .reduce((sum, [, cost]) => sum + cost, 0);

    return tierValue + furnitureCount * 50;
  }
}
