// ── KL DevVerse — Decoration Catalog ─────────────────────────────────
// Wall and floor decorations for house interiors.

import type { DecorationCatalogEntry } from '@/shared/types';

export const DECORATION_CATALOG: readonly DecorationCatalogEntry[] = [
  // ── Posters ────────────────────────────────────────────────────────
  {
    id: 'deco_poster_linux',
    name: 'Linux Penguin Poster',
    description: 'Tux looking majestic. By the way, I use Arch.',
    category: 'poster',
    rarity: 'common',
    icon: '🐧',
    wallMount: true,
  },
  {
    id: 'deco_poster_code',
    name: '"Hello World" Print',
    description: 'A minimalist print of your first program.',
    category: 'poster',
    rarity: 'common',
    icon: '👨‍💻',
    wallMount: true,
  },
  {
    id: 'deco_poster_kerala',
    name: 'Kerala Mural',
    description: 'Traditional Kerala mural art. God\'s own country.',
    category: 'poster',
    rarity: 'uncommon',
    icon: '🎨',
    wallMount: true,
  },
  {
    id: 'deco_poster_retro',
    name: 'Retro Computer Art',
    description: 'Pixel art of a vintage terminal.',
    category: 'poster',
    rarity: 'uncommon',
    icon: '🕹️',
    wallMount: true,
  },

  // ── Trophies ───────────────────────────────────────────────────────
  {
    id: 'deco_trophy_bronze',
    name: 'Bronze Builder Trophy',
    description: 'Awarded to dedicated builders.',
    category: 'trophy',
    rarity: 'uncommon',
    icon: '🥉',
    wallMount: false,
  },
  {
    id: 'deco_trophy_silver',
    name: 'Silver Builder Trophy',
    description: 'For consistent open-source contributions.',
    category: 'trophy',
    rarity: 'rare',
    icon: '🥈',
    wallMount: false,
  },
  {
    id: 'deco_trophy_gold',
    name: 'Gold Builder Trophy',
    description: 'Only for the most dedicated builders.',
    category: 'trophy',
    rarity: 'epic',
    icon: '🥇',
    wallMount: false,
  },

  // ── Plants (wall) ──────────────────────────────────────────────────
  {
    id: 'deco_plant_hanging',
    name: 'Hanging Plant',
    description: 'A trailing vine for the ceiling.',
    category: 'plant',
    rarity: 'common',
    icon: '🌿',
    wallMount: true,
  },

  // ── Lights ─────────────────────────────────────────────────────────
  {
    id: 'deco_light_fairy',
    name: 'Fairy Lights',
    description: 'String lights. Instant cozy vibes.',
    category: 'light',
    rarity: 'common',
    icon: '✨',
    wallMount: true,
  },
  {
    id: 'deco_light_lava',
    name: 'Lava Lamp',
    description: 'Hypnotic blobs of questionable taste.',
    category: 'light',
    rarity: 'uncommon',
    icon: '🫧',
    wallMount: false,
  },

  // ── Frames ─────────────────────────────────────────────────────────
  {
    id: 'deco_frame_github',
    name: 'GitHub Stats Frame',
    description: 'Your contribution graph, framed and mounted.',
    category: 'frame',
    rarity: 'rare',
    icon: '📊',
    wallMount: true,
  },
  {
    id: 'deco_frame_cert',
    name: 'Certificate Frame',
    description: 'Display your certifications proudly.',
    category: 'frame',
    rarity: 'uncommon',
    icon: '📜',
    wallMount: true,
  },

  // ── Banners ────────────────────────────────────────────────────────
  {
    id: 'deco_banner_devverse',
    name: 'KL DevVerse Banner',
    description: 'Show your DevVerse pride.',
    category: 'banner',
    rarity: 'common',
    icon: '🏴',
    wallMount: true,
  },
  {
    id: 'deco_banner_opensource',
    name: 'Open Source Banner',
    description: 'Free as in freedom.',
    category: 'banner',
    rarity: 'uncommon',
    icon: '🏳️',
    wallMount: true,
  },
] as const;

/** Lookup a decoration by catalog ID */
export function getDecorationById(id: string): DecorationCatalogEntry | undefined {
  return DECORATION_CATALOG.find((d) => d.id === id);
}
