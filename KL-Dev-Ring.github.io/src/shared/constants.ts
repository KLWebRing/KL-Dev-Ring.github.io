// ── KL DevVerse — Shared Constants ───────────────────────────────────
// World dimensions, colors, and configuration.
// All magic numbers live here instead of scattered across modules.

// ── World Geometry ───────────────────────────────────────────────────

export const WORLD = {
  /** Ground plane half-extent */
  GROUND_SIZE: 300,
  /** Player spawn position */
  SPAWN: { x: 0, y: 0.35, z: 12 } as const,
  /** Workshop interior z-offset */
  WORKSHOP_Z: 120,
} as const;

// ── Kerala Color Palette ─────────────────────────────────────────────
// Stylized low-poly colors inspired by Kerala's landscape and culture.

export const COLORS = {
  // Terrain
  GRASS: 0x7ec850,
  GRASS_DARK: 0x5ba33c,
  ROAD: 0x5c5f62,
  SIDEWALK: 0xb0b5bc,
  SAND: 0xf5deb3,

  // Water
  RIVER_BLUE: 0x0284c7,
  RIVER_HIGHLIGHT: 0x38bdf8,

  // Buildings
  WALL_CREAM: 0xf4f1ea,
  WALL_WHITE: 0xf3f4f6,
  ROOF_TERRACOTTA: 0xa83a22,
  ROOF_RED: 0x991b1b,
  WOOD_DARK: 0x513528,
  WOOD_LIGHT: 0x78350f,

  // Nature
  MOUNTAIN_GREEN: 0x3d5f47,
  LEAF_GREEN: 0x22c55e,
  COCONUT_BROWN: 0x451a03,

  // Metal / Infrastructure
  METAL_DARK: 0x333333,
  METAL_MEDIUM: 0x4b5563,
  IRON: 0x1f2937,

  // Accent
  GOLD: 0xd97706,
  BRASS: 0xd4af37,
  TEAL: 0x0d9488,

  // Lighting
  SUN_WARM: 0xfff8e1,
  AMBIENT: 0xffffff,
  SKY_GOLDEN: 0xffdcb8,
  FOG_GOLDEN: 0xffdcb8,

  // Character
  SKIN_TONES: [0xfcd34d, 0xfca5a5, 0xf59e0b, 0xd97706, 0xb45309, 0x854d0e] as const,
  COAT_REDS: [0xdc2626, 0xe11d48, 0xbe123c, 0xb91c1c] as const,
  HAIR_DARKS: [0x302a3a, 0x262230, 0x3a3348, 0x1c1829] as const,

  // UI
  OUTLINE: 0x2c2d30,
} as const;

// ── Player Physics ───────────────────────────────────────────────────

export const PLAYER = {
  WALK_SPEED: 5.0,
  RUN_SPEED: 9.5,
  ACCELERATION: 18.0,
  DECELERATION: 12.0,
  JUMP_FORCE: 6.0,
  GRAVITY: -18.0,
  GROUND_Y: 0.35,
  COLLISION_RADIUS: 0.45,
  /** Vertical velocity for coyote time */
  COYOTE_TIME: 0.12,
} as const;

// ── Camera ───────────────────────────────────────────────────────────

export const CAMERA = {
  OFFSET: { x: 0, y: 3.2, z: 6.0 } as const,
  FOV_DEFAULT: 55,
  FOV_SPRINT: 62,
  FOLLOW_SPEED: 5.0,
  ORBIT_SPEED: 0.003,
  PITCH_MIN: -0.6,
  PITCH_MAX: 0.9,
  ZOOM_MIN: 3.0,
  ZOOM_MAX: 12.0,
  COLLISION_OFFSET: 0.3,
} as const;

// ── NPC ──────────────────────────────────────────────────────────────

export const NPC = {
  WAVE_DISTANCE: 4.8,
  TURN_SPEED_FAST: 0.1,
  TURN_SPEED_SLOW: 0.05,
} as const;

// ── Rendering ────────────────────────────────────────────────────────

export const RENDER = {
  SHADOW_MAP_SIZE: 2048,
  MAX_PIXEL_RATIO: 2,
  FOG_DENSITY: 0.0035,
  OUTLINE_THICKNESS: 0.04,
} as const;

// ── Tag Hue Palette ──────────────────────────────────────────────────

export const TAG_HUES: Readonly<Record<string, number>> = {
  ai: 38,
  systems: 184,
  webdev: 326,
  opensource: 153,
  student: 52,
  diaspora: 272,
  security: 5,
  hardware: 198,
  'creative-code': 312,
};

// ── Phase 2: Networking ──────────────────────────────────────────────
// Re-export shared network constants for client convenience
export { NETWORK } from '@shared/constants';

// ── Phase 2: Emotes ──────────────────────────────────────────────────

export const EMOTE = {
  /** Duration in seconds before emote auto-cancels */
  DURATION_SECONDS: 3.0,
  /** Available emotes with display labels */
  LIST: [
    { type: 'wave', label: '👋 Wave', key: '1' },
    { type: 'clap', label: '👏 Clap', key: '2' },
    { type: 'point', label: '👉 Point', key: '3' },
    { type: 'dance', label: '💃 Dance', key: '4' },
    { type: 'sit', label: '🪑 Sit', key: '5' },
    { type: 'celebrate', label: '🎉 Celebrate', key: '6' },
  ] as const,
} as const;

// ═══════════════════════════════════════════════════════════════════════
// Phase 3 — Builder Identity Constants
// ═══════════════════════════════════════════════════════════════════════

import type { BuilderLevel } from '@/shared/types';

/** Builder level progression. XP thresholds, titles, perks, studio unlocks. */
export const BUILDER_LEVELS: readonly BuilderLevel[] = [
  { level: 1,  title: 'Newcomer',         requiredXp: 0,     perks: ['Garage studio'],                         studioUnlock: null },
  { level: 2,  title: 'Apprentice',       requiredXp: 100,   perks: ['Studio theme selection'],                 studioUnlock: null },
  { level: 3,  title: 'Tinkerer',         requiredXp: 300,   perks: ['Extra furniture slot', 'Lounge area'],    studioUnlock: 'lounge' },
  { level: 4,  title: 'Craftsman',        requiredXp: 600,   perks: ['Custom wall color'],                      studioUnlock: null },
  { level: 5,  title: 'Builder',          requiredXp: 1000,  perks: ['Display Gallery', 'Project wall ×6'],     studioUnlock: 'display' },
  { level: 6,  title: 'Architect',        requiredXp: 1500,  perks: ['Server room'],                            studioUnlock: 'server_room' },
  { level: 7,  title: 'Engineer',         requiredXp: 2200,  perks: ['Rare furniture access'],                  studioUnlock: null },
  { level: 8,  title: 'Lead',             requiredXp: 3000,  perks: ['Epic furniture access'],                  studioUnlock: null },
  { level: 9,  title: 'Principal',        requiredXp: 4000,  perks: ['Meeting room expansion'],                 studioUnlock: 'meeting' },
  { level: 10, title: 'Distinguished',    requiredXp: 5500,  perks: ['Legendary cosmetics'],                    studioUnlock: null },
  { level: 11, title: 'Fellow',           requiredXp: 7500,  perks: ['Custom studio name glow'],                studioUnlock: null },
  { level: 12, title: 'Luminary',         requiredXp: 10000, perks: ['Golden builder badge', 'All unlocked'],   studioUnlock: null },
] as const;

/** Get builder level info for a given XP amount */
export function getBuilderLevel(totalXp: number): { level: number; title: string; nextLevelXp: number; progressPercent: number } {
  let current = BUILDER_LEVELS[0]!;
  for (const lvl of BUILDER_LEVELS) {
    if (totalXp >= lvl.requiredXp) current = lvl;
    else break;
  }
  const nextIdx = BUILDER_LEVELS.findIndex(l => l.level === current.level + 1);
  const nextLevel = nextIdx >= 0 ? BUILDER_LEVELS[nextIdx]! : null;
  const nextLevelXp = nextLevel ? nextLevel.requiredXp : current.requiredXp;
  const range = nextLevel ? nextLevel.requiredXp - current.requiredXp : 1;
  const progress = nextLevel ? ((totalXp - current.requiredXp) / range) * 100 : 100;

  return {
    level: current.level,
    title: current.title,
    nextLevelXp,
    progressPercent: Math.min(Math.max(progress, 0), 100),
  };
}

/** Builder Studio configuration constants */
export const STUDIO = {
  /** Interior dimensions (world units) */
  INTERIOR_WIDTH: 12,
  INTERIOR_DEPTH: 10,
  INTERIOR_HEIGHT: 3.5,
  WALL_THICKNESS: 0.3,

  /** Door position (relative to interior) */
  DOOR_WIDTH: 1.4,
  DOOR_HEIGHT: 2.4,

  /** Limits */
  MAX_FURNITURE_SLOTS: 20,
  MAX_PROJECT_WALL_SLOTS: 6,
  MAX_DECORATIONS: 30,

  /** Studio district location in the town */
  DISTRICT_CENTER_X: 30,
  DISTRICT_CENTER_Z: -20,
  PLOT_SPACING: 8,
  PLOTS_PER_ROW: 4,

  /** Available themes */
  THEMES: [
    { id: 'default',              label: 'Default',              wallColor: '#2a2a3a', floorColor: '#3d2e1f', accent: '#4a9eff' },
    { id: 'kerala_traditional',   label: 'Kerala Traditional',   wallColor: '#3b2f20', floorColor: '#5a3e28', accent: '#d4a056' },
    { id: 'cyberpunk',            label: 'Cyberpunk Coder',      wallColor: '#0a0a1a', floorColor: '#121225', accent: '#00f0ff' },
    { id: 'minimal_white',        label: 'Minimal White',        wallColor: '#e8e8e8', floorColor: '#d4d4d4', accent: '#2563eb' },
    { id: 'dark_studio',          label: 'Dark Studio',          wallColor: '#1a1a1a', floorColor: '#141414', accent: '#a855f7' },
    { id: 'tropical',             label: 'Tropical Garden',      wallColor: '#1a3a2a', floorColor: '#2d4a3a', accent: '#34d399' },
  ] as const,
} as const;

/** Items every new player receives for free */
export const STARTER_ITEMS = {
  FURNITURE: ['furn_desk_basic', 'furn_chair_basic', 'furn_monitor_basic', 'furn_bookshelf_basic', 'furn_plant_basic'] as const,
  WARDROBE: ['ward_hair_default', 'ward_shirt_default', 'ward_pants_default', 'ward_shoes_default'] as const,
} as const;

/** Rarity color mapping for UI */
export const RARITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  common:    { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', border: '#4b5563' },
  uncommon:  { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80', border: '#16a34a' },
  rare:      { bg: 'rgba(59,130,246,0.15)',   text: '#60a5fa', border: '#2563eb' },
  epic:      { bg: 'rgba(168,85,247,0.15)',   text: '#c084fc', border: '#9333ea' },
  legendary: { bg: 'rgba(245,158,11,0.15)',   text: '#fbbf24', border: '#d97706' },
};
