// ── KL DevVerse — Cosmetic Catalog ───────────────────────────────────
// Non-wardrobe cosmetic items (special effects, auras, trails).
// These are visual-only and don't affect gameplay.
// Most are unlocked through achievements or events.

import type { CosmeticCatalogEntry } from '@/shared/types';

export const COSMETIC_CATALOG: readonly CosmeticCatalogEntry[] = [
  {
    id: 'cosm_aura_builder',
    name: 'Builder Aura',
    description: 'A subtle glow around your character.',
    slot: 'accessory',
    rarity: 'rare',
    icon: '✨',
    colorHex: '#4a9eff',
  },
  {
    id: 'cosm_aura_golden',
    name: 'Golden Aura',
    description: 'Radiant gold. For Luminary builders only.',
    slot: 'accessory',
    rarity: 'legendary',
    icon: '🌟',
    colorHex: '#fbbf24',
  },
  {
    id: 'cosm_trail_code',
    name: 'Code Trail',
    description: 'Leave a trail of floating code snippets.',
    slot: 'accessory',
    rarity: 'epic',
    icon: '💻',
    colorHex: '#22c55e',
  },
  {
    id: 'cosm_nameplate_rainbow',
    name: 'Rainbow Nameplate',
    description: 'Your nameplate cycles through rainbow colors.',
    slot: 'accessory',
    rarity: 'epic',
    icon: '🌈',
    colorHex: '#ff0000',
  },
] as const;

/** Lookup a cosmetic by ID */
export function getCosmeticById(id: string): CosmeticCatalogEntry | undefined {
  return COSMETIC_CATALOG.find((c) => c.id === id);
}
