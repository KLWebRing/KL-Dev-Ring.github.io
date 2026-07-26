// ── KL DevVerse — District Registry ─────────────────────────────────
// Maps DistrictId → builder function that produces the district's 3D geometry.
// Each district builder returns { group, structures, interactables, npcs }.

import { Group } from 'three';
import type { InteractableItem, Structure, AnimationState, Member } from '@/shared/types';
import type { DistrictId } from '@/world/engine/WorldConfig';

// ── NPC Entry (shared across all districts) ─────────────────────────

export interface NPCEntry {
  mesh: Group;
  type: 'shopkeeper' | 'customer_walk' | 'customer_sit' | 'resident';
  defaultFacing?: number;
  speed?: number;
  direction?: number;
  minZ?: number;
  maxZ?: number;
  animState: AnimationState;
  time: number;
}

// ── District Build Context ──────────────────────────────────────────
// Passed to every district builder so it can register world data.

export interface DistrictBuildContext {
  /** Members from the network registry */
  readonly members: readonly Member[];
  /** Callback to handle interactions */
  readonly onInteract: (event: { type: string; [key: string]: unknown }) => void;
}

// ── District Build Result ───────────────────────────────────────────

export interface DistrictBuildResult {
  /** Root group containing all district geometry */
  readonly group: Group;
  /** Collision structures */
  readonly structures: Structure[];
  /** Proximity interactables */
  readonly interactables: InteractableItem[];
  /** NPCs to animate */
  readonly npcs: NPCEntry[];
  /** River texture reference (if this district has a river) */
  readonly riverTexture?: ReturnType<typeof import('@/graphics/materials').createRiverTexture> | null;
}

// ── Builder function signature ──────────────────────────────────────

export type DistrictBuilder = (ctx: DistrictBuildContext) => DistrictBuildResult;

// ── Registry ────────────────────────────────────────────────────────

const registry = new Map<DistrictId, DistrictBuilder>();

export const districtRegistry = {
  /**
   * Register a district builder function.
   * Called at module load time by each district definition file.
   */
  register(id: DistrictId, builder: DistrictBuilder): void {
    registry.set(id, builder);
  },

  /**
   * Get a district builder by ID.
   */
  get(id: DistrictId): DistrictBuilder | undefined {
    return registry.get(id);
  },

  /**
   * Check if a district builder is registered.
   */
  has(id: DistrictId): boolean {
    return registry.has(id);
  },

  /**
   * Get all registered district IDs.
   */
  getRegisteredIds(): DistrictId[] {
    return [...registry.keys()];
  },
};
