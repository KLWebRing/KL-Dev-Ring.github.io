// ── KL DevVerse — Audio Zone ────────────────────────────────────────
// Defines audio zones in the world — areas where specific ambient
// sounds play. Each zone has bounds, audio layers, and a priority.

// ── Audio Zone Definition ───────────────────────────────────────────

export interface AudioZoneLayer {
  /** Audio layer ID (references AudioAssets) */
  readonly layerId: string;
  /** Volume multiplier within this zone (0..1) */
  readonly volume: number;
}

export interface AudioZoneDef {
  readonly id: string;
  readonly label: string;
  /** Zone shape — circle or rectangle */
  readonly shape: 'circle' | 'rect';
  /** Circle: center + radius */
  readonly cx?: number;
  readonly cz?: number;
  readonly radius?: number;
  /** Rect: AABB bounds */
  readonly minX?: number;
  readonly minZ?: number;
  readonly maxX?: number;
  readonly maxZ?: number;
  /** Audio layers active in this zone */
  readonly layers: readonly AudioZoneLayer[];
  /** Priority for overlapping zones (higher = wins) */
  readonly priority: number;
  /** Fade distance — how far outside the zone audio fades (units) */
  readonly fadeDistance: number;
}

// ── Zone Definitions ────────────────────────────────────────────────

export const AUDIO_ZONES: readonly AudioZoneDef[] = [
  {
    id: 'town_center',
    label: 'Developer Town Center',
    shape: 'circle',
    cx: 0, cz: 0, radius: 40,
    layers: [
      { layerId: 'birds_morning', volume: 0.3 },
      { layerId: 'wind_light', volume: 0.1 },
      { layerId: 'traffic_distant', volume: 0.08 },
    ],
    priority: 1,
    fadeDistance: 10,
  },
  {
    id: 'river_area',
    label: 'Backwater River',
    shape: 'rect',
    minX: 35, minZ: -100, maxX: 55, maxZ: 100,
    layers: [
      { layerId: 'river_flow', volume: 0.35 },
      { layerId: 'birds_morning', volume: 0.15 },
    ],
    priority: 2,
    fadeDistance: 8,
  },
  {
    id: 'hall_of_fame',
    label: 'Hall of Fame',
    shape: 'circle',
    cx: 0, cz: 155, radius: 20,
    layers: [
      { layerId: 'ambient_day', volume: 0.12 },
      { layerId: 'wind_light', volume: 0.1 },
    ],
    priority: 1,
    fadeDistance: 8,
  },
  // Future zones for other districts
  {
    id: 'marketplace',
    label: 'Marketplace',
    shape: 'rect',
    minX: 60, minZ: -60, maxX: 140, maxZ: 60,
    layers: [
      { layerId: 'market_bustle', volume: 0.25 },
      { layerId: 'tea_shop_chatter', volume: 0.15 },
    ],
    priority: 2,
    fadeDistance: 12,
  },
  {
    id: 'temple',
    label: 'Temple Square',
    shape: 'circle',
    cx: -100, cz: 100, radius: 35,
    layers: [
      { layerId: 'temple_bells', volume: 0.2 },
      { layerId: 'birds_evening', volume: 0.15 },
    ],
    priority: 2,
    fadeDistance: 15,
  },
  {
    id: 'lakeside',
    label: 'Lakeside',
    shape: 'rect',
    minX: 60, minZ: -140, maxX: 140, maxZ: -60,
    layers: [
      { layerId: 'ocean_waves', volume: 0.3 },
      { layerId: 'boat_creak', volume: 0.1 },
      { layerId: 'birds_evening', volume: 0.1 },
    ],
    priority: 2,
    fadeDistance: 15,
  },
  {
    id: 'beach',
    label: 'Beach Road',
    shape: 'rect',
    minX: 60, minZ: 60, maxX: 140, maxZ: 140,
    layers: [
      { layerId: 'ocean_waves', volume: 0.4 },
      { layerId: 'wind_strong', volume: 0.15 },
    ],
    priority: 2,
    fadeDistance: 12,
  },
];

// ── Helper: check if position is inside a zone ──────────────────────

export function isInsideZone(zone: AudioZoneDef, x: number, z: number): boolean {
  if (zone.shape === 'circle') {
    const dx = x - (zone.cx ?? 0);
    const dz = z - (zone.cz ?? 0);
    return Math.sqrt(dx * dx + dz * dz) <= (zone.radius ?? 0);
  }

  // Rect
  return (
    x >= (zone.minX ?? -Infinity) && x <= (zone.maxX ?? Infinity) &&
    z >= (zone.minZ ?? -Infinity) && z <= (zone.maxZ ?? Infinity)
  );
}

/**
 * Get the distance from a position to the edge of a zone.
 * Negative = inside, positive = outside.
 */
export function distanceToZoneEdge(zone: AudioZoneDef, x: number, z: number): number {
  if (zone.shape === 'circle') {
    const dx = x - (zone.cx ?? 0);
    const dz = z - (zone.cz ?? 0);
    return Math.sqrt(dx * dx + dz * dz) - (zone.radius ?? 0);
  }

  // Rect — distance to nearest edge
  const dLeft = x - (zone.minX ?? 0);
  const dRight = (zone.maxX ?? 0) - x;
  const dTop = z - (zone.minZ ?? 0);
  const dBottom = (zone.maxZ ?? 0) - z;

  // If inside, return negative (distance to nearest edge)
  if (dLeft > 0 && dRight > 0 && dTop > 0 && dBottom > 0) {
    return -Math.min(dLeft, dRight, dTop, dBottom);
  }

  // Outside — return positive distance
  const dx = Math.max(0, -dLeft, -dRight);
  const dz2 = Math.max(0, -dTop, -dBottom);
  return Math.sqrt(dx * dx + dz2 * dz2);
}
