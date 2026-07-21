// ── KL DevVerse — Wardrobe Catalog ───────────────────────────────────
// Character customization items. Each item corresponds to a visual
// change in the characterSystem.ts renderer.

import type { CosmeticCatalogEntry, WardrobeSlot } from '@/shared/types';

export const WARDROBE_CATALOG: readonly CosmeticCatalogEntry[] = [
  // ── Hair ───────────────────────────────────────────────────────────
  {
    id: 'ward_hair_default',
    name: 'Default Hair',
    description: 'Classic developer cut.',
    slot: 'hair',
    rarity: 'common',
    icon: '💇',
    colorHex: '#2c1810',
  },
  {
    id: 'ward_hair_messy',
    name: 'Messy Hair',
    description: 'Just rolled out of a 48-hour hackathon.',
    slot: 'hair',
    rarity: 'common',
    icon: '💇',
    colorHex: '#3b2415',
  },
  {
    id: 'ward_hair_short',
    name: 'Short Crop',
    description: 'Clean and minimal.',
    slot: 'hair',
    rarity: 'common',
    icon: '💇',
    colorHex: '#1a0d05',
  },
  {
    id: 'ward_hair_long',
    name: 'Long Hair',
    description: 'Flowing locks of a free spirit.',
    slot: 'hair',
    rarity: 'uncommon',
    icon: '💇',
    colorHex: '#2c1810',
  },
  {
    id: 'ward_hair_neon',
    name: 'Neon Hair',
    description: 'Cyberpunk vibes. Glow included.',
    slot: 'hair',
    rarity: 'rare',
    icon: '💇',
    colorHex: '#00f0ff',
  },

  // ── Shirts ─────────────────────────────────────────────────────────
  {
    id: 'ward_shirt_default',
    name: 'Red Kurta',
    description: 'Traditional Kerala-style shirt. The default look.',
    slot: 'shirt',
    rarity: 'common',
    icon: '👔',
    colorHex: '#c0392b',
  },
  {
    id: 'ward_shirt_teal',
    name: 'Teal Hoodie',
    description: 'DevVerse signature hoodie.',
    slot: 'shirt',
    rarity: 'common',
    icon: '👔',
    colorHex: '#1abc9c',
  },
  {
    id: 'ward_shirt_dark',
    name: 'Dark Henley',
    description: 'Understated. Professional.',
    slot: 'shirt',
    rarity: 'common',
    icon: '👔',
    colorHex: '#2c3e50',
  },
  {
    id: 'ward_shirt_github',
    name: 'GitHub Contributor Tee',
    description: 'Earned through open-source contributions.',
    slot: 'shirt',
    rarity: 'uncommon',
    icon: '👔',
    colorHex: '#24292e',
  },
  {
    id: 'ward_shirt_golden',
    name: 'Golden Builder Robe',
    description: 'Reserved for Luminary-level builders.',
    slot: 'shirt',
    rarity: 'legendary',
    icon: '👔',
    colorHex: '#d4a056',
  },

  // ── Pants ──────────────────────────────────────────────────────────
  {
    id: 'ward_pants_default',
    name: 'Dark Pants',
    description: 'Classic dark trousers.',
    slot: 'pants',
    rarity: 'common',
    icon: '👖',
    colorHex: '#18181b',
  },
  {
    id: 'ward_pants_jeans',
    name: 'Jeans',
    description: 'Casual denim.',
    slot: 'pants',
    rarity: 'common',
    icon: '👖',
    colorHex: '#2563eb',
  },
  {
    id: 'ward_pants_cargo',
    name: 'Cargo Pants',
    description: 'Extra pockets for extra USB sticks.',
    slot: 'pants',
    rarity: 'uncommon',
    icon: '👖',
    colorHex: '#4a5568',
  },

  // ── Shoes ──────────────────────────────────────────────────────────
  {
    id: 'ward_shoes_default',
    name: 'Sneakers',
    description: 'Comfortable everyday sneakers.',
    slot: 'shoes',
    rarity: 'common',
    icon: '👟',
    colorHex: '#f5f5f5',
  },
  {
    id: 'ward_shoes_boots',
    name: 'Developer Boots',
    description: 'Sturdy boots for exploring the metaverse.',
    slot: 'shoes',
    rarity: 'uncommon',
    icon: '🥾',
    colorHex: '#5a3e28',
  },

  // ── Backpacks ──────────────────────────────────────────────────────
  {
    id: 'ward_backpack_basic',
    name: 'Laptop Backpack',
    description: 'Fits a 15-inch laptop and your dreams.',
    slot: 'backpack',
    rarity: 'common',
    icon: '🎒',
    colorHex: '#374151',
  },
  {
    id: 'ward_backpack_dev',
    name: 'DevVerse Pack',
    description: 'Official KL DevVerse backpack with hex logo.',
    slot: 'backpack',
    rarity: 'rare',
    icon: '🎒',
    colorHex: '#1abc9c',
  },

  // ── Accessories ────────────────────────────────────────────────────
  {
    id: 'ward_acc_glasses',
    name: 'Blue Light Glasses',
    description: 'Protect those precious developer eyes.',
    slot: 'accessory',
    rarity: 'common',
    icon: '👓',
    colorHex: '#a0aec0',
  },
  {
    id: 'ward_acc_headphones',
    name: 'Over-ear Headphones',
    description: 'Noise cancelling. Essential for focus.',
    slot: 'accessory',
    rarity: 'uncommon',
    icon: '🎧',
    colorHex: '#1a1a1a',
  },
  {
    id: 'ward_acc_hat_cap',
    name: 'Developer Cap',
    description: 'A snapback cap with </> emblem.',
    slot: 'accessory',
    rarity: 'common',
    icon: '🧢',
    colorHex: '#1a1a1a',
  },
] as const;

/** Lookup a wardrobe item by catalog ID */
export function getWardrobeItemById(id: string): CosmeticCatalogEntry | undefined {
  return WARDROBE_CATALOG.find((w) => w.id === id);
}

/** Get all items for a specific wardrobe slot */
export function getWardrobeBySlot(slot: WardrobeSlot): readonly CosmeticCatalogEntry[] {
  return WARDROBE_CATALOG.filter((w) => w.slot === slot);
}
