// ── KL DevVerse — Landmark Registry ─────────────────────────────────
// Registry of all world landmarks with metadata.
// Used by DiscoveryEngine, fast-travel, minimap, and UI.

import type { DistrictId } from '@/world/engine/WorldConfig';

// ── Landmark Category ───────────────────────────────────────────────

export type LandmarkCategory =
  | 'monument'
  | 'building'
  | 'natural'
  | 'cultural'
  | 'infrastructure'
  | 'viewpoint'
  ;

// ── Landmark Definition ─────────────────────────────────────────────

export interface LandmarkDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: LandmarkCategory;
  readonly districtId: DistrictId;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  /** Camera angle for preview screenshots */
  readonly previewAngle?: { readonly yaw: number; readonly pitch: number };
  /** Interaction type when player approaches */
  readonly interactionType: 'view' | 'teleport' | 'enter' | 'inspect';
  /** Whether this landmark is a fast-travel destination */
  readonly fastTravel: boolean;
}

// ── Registry ────────────────────────────────────────────────────────

const landmarks = new Map<string, LandmarkDef>();

export const landmarkRegistry = {
  register(landmark: LandmarkDef): void {
    landmarks.set(landmark.id, landmark);
  },

  get(id: string): LandmarkDef | undefined {
    return landmarks.get(id);
  },

  getAll(): LandmarkDef[] {
    return [...landmarks.values()];
  },

  getByDistrict(districtId: DistrictId): LandmarkDef[] {
    return [...landmarks.values()].filter(l => l.districtId === districtId);
  },

  getByCategory(category: LandmarkCategory): LandmarkDef[] {
    return [...landmarks.values()].filter(l => l.category === category);
  },

  getFastTravelPoints(): LandmarkDef[] {
    return [...landmarks.values()].filter(l => l.fastTravel);
  },

  count(): number {
    return landmarks.size;
  },
};

// ── Register Developer Town Landmarks ───────────────────────────────

const DEV_TOWN_LANDMARKS: LandmarkDef[] = [
  {
    id: 'central_plaza',
    name: 'Central Plaza',
    description: 'The heart of Developer Town — a circular plaza with a fountain.',
    category: 'monument',
    districtId: 'developer_town',
    position: { x: 0, y: 0, z: 0 },
    interactionType: 'view',
    fastTravel: true,
  },
  {
    id: 'town_hall',
    name: 'Town Hall',
    description: 'The grand KL DevVerse Town Hall with Kerala-style columns.',
    category: 'building',
    districtId: 'developer_town',
    position: { x: 0, y: 0, z: -22 },
    interactionType: 'enter',
    fastTravel: true,
  },
  {
    id: 'hall_of_fame',
    name: 'Hall of Fame',
    description: 'Monument to the top contributors with golden podiums.',
    category: 'monument',
    districtId: 'developer_town',
    position: { x: 0, y: 0, z: 162 },
    interactionType: 'enter',
    fastTravel: true,
  },
  {
    id: 'backwater_river',
    name: 'Backwater River',
    description: 'A Kerala-style backwater flowing through the east side of town.',
    category: 'natural',
    districtId: 'developer_town',
    position: { x: 45, y: 0, z: 0 },
    interactionType: 'view',
    fastTravel: false,
  },
  {
    id: 'wooden_bridge',
    name: 'Wooden Bridge',
    description: 'A rustic bridge crossing the backwater river.',
    category: 'infrastructure',
    districtId: 'developer_town',
    position: { x: 45, y: 0, z: 0 },
    interactionType: 'view',
    fastTravel: false,
  },
];

// Self-register on import
for (const lm of DEV_TOWN_LANDMARKS) {
  landmarkRegistry.register(lm);
}
