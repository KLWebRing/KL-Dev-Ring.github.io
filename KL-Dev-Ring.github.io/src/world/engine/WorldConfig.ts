// ── KL DevVerse — World Config ───────────────────────────────────────
// Data-driven world configuration.
// All world-level constants, district definitions, and hierarchy metadata.
// No magic numbers — everything lives here.

import type { TimePhase } from './WorldClock';

// ═══════════════════════════════════════════════════════════════════════
// World Hierarchy: World → District → Sector → Chunk → Objects
// ═══════════════════════════════════════════════════════════════════════

// ── District IDs ────────────────────────────────────────────────────

export type DistrictId =
  | 'developer_town'
  | 'residential_quarter'
  | 'marketplace'
  | 'innovation_hub'
  | 'community_park'
  | 'lakeside'
  | 'beach_road'
  | 'temple_square'
  ;

// ── District Definition ─────────────────────────────────────────────

export interface DistrictLightingProfile {
  /** Multiplier for ambient intensity (1.0 = default) */
  readonly ambientMultiplier: number;
  /** Fog density multiplier (1.0 = default) */
  readonly fogMultiplier: number;
  /** Tint color applied to ambient light (hex) */
  readonly ambientTint: number;
}

export interface DistrictBounds {
  /** AABB min corner (world space) */
  readonly minX: number;
  readonly minZ: number;
  /** AABB max corner (world space) */
  readonly maxX: number;
  readonly maxZ: number;
}

export interface SpawnPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly label: string;
}

export interface DistrictDefinition {
  readonly id: DistrictId;
  readonly name: string;
  readonly description: string;
  readonly bounds: DistrictBounds;
  readonly spawnPoints: readonly SpawnPoint[];
  readonly lighting: DistrictLightingProfile;
  readonly ambientAudioZone: string;   // references AudioZone id
  readonly weatherModifier: string;    // e.g. 'foggy', 'sunny', 'default'
  readonly landmarks: readonly string[]; // landmark IDs
  readonly enabled: boolean;           // false = placeholder, not loaded
}

// ── Chunk Configuration ─────────────────────────────────────────────

export const CHUNK_CONFIG = {
  /** Size of each chunk in world units */
  SIZE: 32,
  /** How many chunks around the player to keep loaded (radius) */
  LOAD_RADIUS: 3,
  /** How many chunks before unloading (radius) */
  UNLOAD_RADIUS: 5,
  /** Maximum concurrent chunk loads per frame */
  MAX_LOADS_PER_FRAME: 2,
} as const;

// ── World Clock Configuration ───────────────────────────────────────

export const WORLD_CLOCK_CONFIG = {
  /** Starting hour (8 AM) */
  START_HOUR: 8.0,
  /** Game hours per real second — 1/60 means 1 game hour per real minute */
  TIME_SCALE: 1.0 / 60.0,
} as const;

// ── Lighting Presets by Time Phase ──────────────────────────────────

export interface TimeLightingPreset {
  readonly skyColor: number;
  readonly fogColor: number;
  readonly fogDensity: number;
  readonly sunColor: number;
  readonly sunIntensity: number;
  readonly ambientColor: number;
  readonly ambientIntensity: number;
}

export const TIME_LIGHTING: Readonly<Record<TimePhase, TimeLightingPreset>> = {
  dawn: {
    skyColor: 0xffc9a8,
    fogColor: 0xffc9a8,
    fogDensity: 0.004,
    sunColor: 0xffe4c0,
    sunIntensity: 0.6,
    ambientColor: 0xffe8d0,
    ambientIntensity: 0.3,
  },
  morning: {
    skyColor: 0x87ceeb,
    fogColor: 0xc8e6f5,
    fogDensity: 0.003,
    sunColor: 0xfff8e1,
    sunIntensity: 1.2,
    ambientColor: 0xffffff,
    ambientIntensity: 0.4,
  },
  noon: {
    skyColor: 0x6db8e8,
    fogColor: 0xb0d8f0,
    fogDensity: 0.0025,
    sunColor: 0xffffff,
    sunIntensity: 1.5,
    ambientColor: 0xffffff,
    ambientIntensity: 0.5,
  },
  afternoon: {
    skyColor: 0x87ceeb,
    fogColor: 0xc8e6f5,
    fogDensity: 0.003,
    sunColor: 0xfff5d0,
    sunIntensity: 1.3,
    ambientColor: 0xfff8e8,
    ambientIntensity: 0.45,
  },
  golden_hour: {
    skyColor: 0xffdcb8,
    fogColor: 0xffdcb8,
    fogDensity: 0.0035,
    sunColor: 0xffc870,
    sunIntensity: 1.0,
    ambientColor: 0xffd8a0,
    ambientIntensity: 0.35,
  },
  sunset: {
    skyColor: 0xff8c50,
    fogColor: 0xffaa70,
    fogDensity: 0.004,
    sunColor: 0xff6030,
    sunIntensity: 0.7,
    ambientColor: 0xff9060,
    ambientIntensity: 0.25,
  },
  dusk: {
    skyColor: 0x3a4a6a,
    fogColor: 0x3a4a6a,
    fogDensity: 0.005,
    sunColor: 0x8080c0,
    sunIntensity: 0.3,
    ambientColor: 0x6070a0,
    ambientIntensity: 0.2,
  },
  night: {
    skyColor: 0x0a0e1a,
    fogColor: 0x0a0e1a,
    fogDensity: 0.006,
    sunColor: 0x4060a0,
    sunIntensity: 0.1,
    ambientColor: 0x202840,
    ambientIntensity: 0.15,
  },
};

// ── District Definitions ────────────────────────────────────────────

export const DISTRICTS: readonly DistrictDefinition[] = [
  {
    id: 'developer_town',
    name: 'Developer Town',
    description: 'The heart of KL DevVerse. Central plaza, town hall, coding shops, and the hall of fame.',
    bounds: { minX: -60, minZ: -60, maxX: 60, maxZ: 180 },
    spawnPoints: [
      { x: 0, y: 0.35, z: 12, label: 'Central Plaza' },
      { x: 0, y: 0.35, z: -13, label: 'Town Hall' },
      { x: 0, y: 0.35, z: 146, label: 'Hall of Fame' },
    ],
    lighting: { ambientMultiplier: 1.0, fogMultiplier: 1.0, ambientTint: 0xffffff },
    ambientAudioZone: 'town_center',
    weatherModifier: 'default',
    landmarks: ['central_plaza', 'town_hall', 'hall_of_fame', 'backwater_river', 'wooden_bridge'],
    enabled: true,
  },
  {
    id: 'residential_quarter',
    name: 'Residential Quarter',
    description: 'Quiet Kerala-style neighborhood with winding paths and Builder Studios.',
    bounds: { minX: -120, minZ: -60, maxX: -60, maxZ: 60 },
    spawnPoints: [{ x: -90, y: 0.35, z: 0, label: 'Residential Gate' }],
    lighting: { ambientMultiplier: 0.95, fogMultiplier: 1.1, ambientTint: 0xfff8e8 },
    ambientAudioZone: 'residential',
    weatherModifier: 'default',
    landmarks: [],
    enabled: false, // placeholder
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Bustling Kerala marketplace with cobblestone paths and colorful awnings.',
    bounds: { minX: 60, minZ: -60, maxX: 140, maxZ: 60 },
    spawnPoints: [{ x: 80, y: 0.35, z: 0, label: 'Market Entrance' }],
    lighting: { ambientMultiplier: 1.1, fogMultiplier: 0.8, ambientTint: 0xfff5e0 },
    ambientAudioZone: 'marketplace',
    weatherModifier: 'sunny',
    landmarks: [],
    enabled: false,
  },
  {
    id: 'innovation_hub',
    name: 'Innovation Hub',
    description: 'Futuristic tech park with glass buildings and startup offices.',
    bounds: { minX: -60, minZ: -140, maxX: 60, maxZ: -60 },
    spawnPoints: [{ x: 0, y: 0.35, z: -100, label: 'Hub Gate' }],
    lighting: { ambientMultiplier: 1.05, fogMultiplier: 0.9, ambientTint: 0xe8f0ff },
    ambientAudioZone: 'innovation',
    weatherModifier: 'default',
    landmarks: [],
    enabled: false,
  },
  {
    id: 'community_park',
    name: 'Community Park',
    description: 'Open green park with a gazebo, walking paths, and event spaces.',
    bounds: { minX: -140, minZ: -140, maxX: -60, maxZ: -60 },
    spawnPoints: [{ x: -100, y: 0.35, z: -100, label: 'Park Gate' }],
    lighting: { ambientMultiplier: 1.0, fogMultiplier: 1.0, ambientTint: 0xf0ffe0 },
    ambientAudioZone: 'park',
    weatherModifier: 'default',
    landmarks: [],
    enabled: false,
  },
  {
    id: 'lakeside',
    name: 'Lakeside',
    description: 'Serene Kerala backwater area with boats, fishermen, and houseboats.',
    bounds: { minX: 60, minZ: -140, maxX: 140, maxZ: -60 },
    spawnPoints: [{ x: 100, y: 0.35, z: -100, label: 'Lake Shore' }],
    lighting: { ambientMultiplier: 0.9, fogMultiplier: 1.4, ambientTint: 0xe0f0ff },
    ambientAudioZone: 'lakeside',
    weatherModifier: 'foggy',
    landmarks: [],
    enabled: false,
  },
  {
    id: 'beach_road',
    name: 'Beach Road',
    description: 'Coastal road with palm trees, seafood stalls, and ocean views.',
    bounds: { minX: 60, minZ: 60, maxX: 140, maxZ: 140 },
    spawnPoints: [{ x: 100, y: 0.35, z: 100, label: 'Beach Entrance' }],
    lighting: { ambientMultiplier: 1.1, fogMultiplier: 0.7, ambientTint: 0xfff8f0 },
    ambientAudioZone: 'beach',
    weatherModifier: 'sunny',
    landmarks: [],
    enabled: false,
  },
  {
    id: 'temple_square',
    name: 'Temple Square',
    description: 'Traditional Kerala temple complex with ritual spaces and bell towers.',
    bounds: { minX: -140, minZ: 60, maxX: -60, maxZ: 140 },
    spawnPoints: [{ x: -100, y: 0.35, z: 100, label: 'Temple Gate' }],
    lighting: { ambientMultiplier: 0.95, fogMultiplier: 1.0, ambientTint: 0xfff0e0 },
    ambientAudioZone: 'temple',
    weatherModifier: 'default',
    landmarks: [],
    enabled: false,
  },
] as const;

// ── Helper Functions ────────────────────────────────────────────────

/** Find which district a world position belongs to */
export function getDistrictAt(x: number, z: number): DistrictDefinition | null {
  for (const district of DISTRICTS) {
    const b = district.bounds;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) {
      return district;
    }
  }
  return null;
}

/** Get district by ID */
export function getDistrictById(id: DistrictId): DistrictDefinition | null {
  return DISTRICTS.find(d => d.id === id) ?? null;
}

/** Get all enabled districts */
export function getEnabledDistricts(): readonly DistrictDefinition[] {
  return DISTRICTS.filter(d => d.enabled);
}

/** Interpolate between two lighting presets */
export function lerpLighting(
  a: TimeLightingPreset,
  b: TimeLightingPreset,
  t: number,
): TimeLightingPreset {
  const lerp = (v1: number, v2: number) => v1 + (v2 - v1) * t;
  const lerpColor = (c1: number, c2: number) => {
    const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
    const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
    const r = Math.round(lerp(r1, r2));
    const g = Math.round(lerp(g1, g2));
    const bl = Math.round(lerp(b1, b2));
    return (r << 16) | (g << 8) | bl;
  };

  return {
    skyColor: lerpColor(a.skyColor, b.skyColor),
    fogColor: lerpColor(a.fogColor, b.fogColor),
    fogDensity: lerp(a.fogDensity, b.fogDensity),
    sunColor: lerpColor(a.sunColor, b.sunColor),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity),
    ambientColor: lerpColor(a.ambientColor, b.ambientColor),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity),
  };
}
