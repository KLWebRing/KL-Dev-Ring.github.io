// ── KL DevVerse — Economy Types ──────────────────────────────────────
// Frontend type definitions for the economy system.
// Mirrors the Prisma schema and API responses.

// ── Currency ────────────────────────────────────────────────────────

export type CurrencyType = 'BUILDER_CASH' | 'XP' | 'REPUTATION' | 'INNOVATION' | 'SEASON_TOKEN';

export interface CurrencyDisplay {
  readonly type: CurrencyType;
  readonly label: string;
  readonly shortLabel: string;
  readonly symbol: string;
  readonly color: string;
  readonly icon: string;
}

export const CURRENCY_DISPLAY: Record<CurrencyType, CurrencyDisplay> = {
  BUILDER_CASH: {
    type: 'BUILDER_CASH',
    label: 'Builder Cash',
    shortLabel: 'Cash',
    symbol: '₿C',
    color: '#fbbf24',
    icon: '💰',
  },
  XP: {
    type: 'XP',
    label: 'Builder XP',
    shortLabel: 'XP',
    symbol: 'XP',
    color: '#60a5fa',
    icon: '⭐',
  },
  REPUTATION: {
    type: 'REPUTATION',
    label: 'Reputation',
    shortLabel: 'Rep',
    symbol: 'REP',
    color: '#a78bfa',
    icon: '🏆',
  },
  INNOVATION: {
    type: 'INNOVATION',
    label: 'Innovation Score',
    shortLabel: 'Innov',
    symbol: 'INV',
    color: '#34d399',
    icon: '💡',
  },
  SEASON_TOKEN: {
    type: 'SEASON_TOKEN',
    label: 'Season Tokens',
    shortLabel: 'Season',
    symbol: 'ST',
    color: '#f472b6',
    icon: '🎫',
  },
};

// ── Wallet ──────────────────────────────────────────────────────────

export interface Wallet {
  readonly builderCash: number;
  readonly totalXp: number;
  readonly level: number;
  readonly reputation: number;
  readonly innovationScore: number;
  readonly seasonTokens: number;
  readonly studioValue: number;
  readonly leaderboardRating: number;
  readonly prestigeLevel: number;
  readonly dailyLoginStreak: number;
  readonly lastLoginDate: string | null;
}

// ── Transaction ─────────────────────────────────────────────────────

export type TransactionType = 'EARN' | 'SPEND' | 'BONUS' | 'REFUND';

export interface WalletTransaction {
  readonly id: string;
  readonly type: TransactionType;
  readonly currency: CurrencyType;
  readonly amount: number;
  readonly source: string;
  readonly description: string;
  readonly balanceBefore: number;
  readonly balanceAfter: number;
  readonly createdAt: string;
}

export interface TransactionPage {
  readonly transactions: readonly WalletTransaction[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
  };
}

// ── Daily Reward ────────────────────────────────────────────────────

export interface DailyRewardResult {
  readonly streakDay: number;
  readonly reward: {
    readonly currency: CurrencyType;
    readonly amount: number;
  };
  readonly newBalance: number;
}

// ── Rarity ──────────────────────────────────────────────────────────

export type ItemRarity =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'
  | 'FOUNDER'
  | 'SEASONAL'
  | 'DEVELOPER_EXCLUSIVE'
  ;

export interface RarityDisplay {
  readonly rarity: ItemRarity;
  readonly label: string;
  readonly color: string;
  readonly bgColor: string;
  readonly borderColor: string;
  readonly glow: string;
}

export const RARITY_DISPLAY: Record<ItemRarity, RarityDisplay> = {
  COMMON: {
    rarity: 'COMMON',
    label: 'Common',
    color: '#9ca3af',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    borderColor: 'rgba(156, 163, 175, 0.3)',
    glow: 'none',
  },
  UNCOMMON: {
    rarity: 'UNCOMMON',
    label: 'Uncommon',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    glow: 'none',
  },
  RARE: {
    rarity: 'RARE',
    label: 'Rare',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    glow: '0 0 8px rgba(59, 130, 246, 0.3)',
  },
  EPIC: {
    rarity: 'EPIC',
    label: 'Epic',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.1)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    glow: '0 0 12px rgba(168, 85, 247, 0.4)',
  },
  LEGENDARY: {
    rarity: 'LEGENDARY',
    label: 'Legendary',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    glow: '0 0 16px rgba(245, 158, 11, 0.5)',
  },
  FOUNDER: {
    rarity: 'FOUNDER',
    label: 'Founder',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    glow: '0 0 16px rgba(239, 68, 68, 0.5)',
  },
  SEASONAL: {
    rarity: 'SEASONAL',
    label: 'Seasonal',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    glow: '0 0 12px rgba(6, 182, 212, 0.4)',
  },
  DEVELOPER_EXCLUSIVE: {
    rarity: 'DEVELOPER_EXCLUSIVE',
    label: 'Dev Exclusive',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.5)',
    glow: '0 0 16px rgba(236, 72, 153, 0.5)',
  },
};

// ── Marketplace Item ────────────────────────────────────────────────

export interface MarketplaceItem {
  readonly id: string;
  readonly catalogId: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly rarity: ItemRarity;
  readonly price: number;
  readonly currency: CurrencyType;
  readonly isLimited: boolean;
  readonly limitedUntil: string | null;
  readonly stock: number | null;
  readonly tags: readonly string[];
  readonly featured: boolean;
  readonly requiredTier: number;
}

// ── Studio Tier ─────────────────────────────────────────────────────

export interface StudioTierDef {
  readonly tier: number;
  readonly name: string;
  readonly description: string;
  readonly upgradeCost: number;
  readonly rooms: number;
  readonly furnitureSlots: number;
  readonly projectSlots: number;
  readonly maxVisitors: number;
}

export const STUDIO_TIERS: readonly StudioTierDef[] = [
  { tier: 1, name: 'Garage Workspace',        description: 'A humble beginning',              upgradeCost: 0,     rooms: 1, furnitureSlots: 5,  projectSlots: 2,  maxVisitors: 3 },
  { tier: 2, name: 'Professional Workspace',   description: 'Getting serious',                 upgradeCost: 500,   rooms: 2, furnitureSlots: 10, projectSlots: 3,  maxVisitors: 5 },
  { tier: 3, name: 'Innovation Lab',           description: 'Where ideas become reality',      upgradeCost: 2000,  rooms: 3, furnitureSlots: 18, projectSlots: 4,  maxVisitors: 8 },
  { tier: 4, name: 'Startup Office',           description: 'Building the future',             upgradeCost: 8000,  rooms: 4, furnitureSlots: 25, projectSlots: 5,  maxVisitors: 12 },
  { tier: 5, name: 'Technology Campus',        description: 'A tech empire',                   upgradeCost: 25000, rooms: 6, furnitureSlots: 35, projectSlots: 6,  maxVisitors: 20 },
  { tier: 6, name: 'Innovation Headquarters',  description: 'The pinnacle of builder identity', upgradeCost: 75000, rooms: 8, furnitureSlots: 50, projectSlots: 8,  maxVisitors: 50 },
];
