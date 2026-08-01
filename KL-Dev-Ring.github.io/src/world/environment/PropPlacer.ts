// ── KL DevVerse — Prop Placer ───────────────────────────────────────
// Data-driven prop placement system.
// Reads placement definitions and instantiates environment objects
// from EnvironmentFactory at specified positions.
//
// Used by district definitions to populate the world with props.

import { Group } from 'three';
import type { Structure } from '@/shared/types';
import {
  createCoconutTree,
  createStreetLight,
  createBench,
  createBusStop,
  createTeaShop,
  createSignBoard,
  createFlowerBed,
  createElectricPole,
  createBoat,
  type EnvironmentObject,
} from './EnvironmentFactory';

// ── Prop Types ──────────────────────────────────────────────────────

export type PropType =
  | 'coconut_tree'
  | 'street_light'
  | 'bench'
  | 'bus_stop'
  | 'tea_shop'
  | 'sign_board'
  | 'flower_bed'
  | 'electric_pole'
  | 'boat'
  ;

// ── Prop Placement Definition ───────────────────────────────────────

export interface PropPlacement {
  readonly type: PropType;
  readonly x: number;
  readonly z: number;
  readonly y?: number;
  readonly rotationY?: number;
  readonly scale?: number;
  readonly variant?: number;
}

// ── Factory Map ─────────────────────────────────────────────────────

type PropFactory = (variant?: number) => EnvironmentObject;

const PROP_FACTORIES: Record<PropType, PropFactory> = {
  coconut_tree: (v) => createCoconutTree(v),
  street_light: () => createStreetLight(),
  bench: () => createBench(),
  bus_stop: () => createBusStop(),
  tea_shop: () => createTeaShop(),
  sign_board: () => createSignBoard(),
  flower_bed: (v) => createFlowerBed(v),
  electric_pole: () => createElectricPole(),
  boat: () => createBoat(),
};

// ── Prop Placer ─────────────────────────────────────────────────────

export interface PropPlacerResult {
  /** Root group containing all placed props */
  readonly group: Group;
  /** Collision structures for all placed props */
  readonly structures: Structure[];
}

/**
 * Place a list of props into a parent group.
 * Returns the group and collision data.
 */
export function placeProps(placements: readonly PropPlacement[]): PropPlacerResult {
  const group = new Group();
  group.name = 'props';
  const structures: Structure[] = [];

  for (const placement of placements) {
    const factory = PROP_FACTORIES[placement.type];
    if (!factory) {
      console.warn(`[PropPlacer] Unknown prop type: ${placement.type}`);
      continue;
    }

    const obj = factory(placement.variant);
    const g = obj.group;

    // Position
    g.position.set(placement.x, placement.y ?? 0, placement.z);

    // Rotation
    if (placement.rotationY !== undefined) {
      g.rotation.y = placement.rotationY;
    }

    // Scale
    if (placement.scale !== undefined) {
      g.scale.setScalar(placement.scale);
    }

    group.add(g);

    // Register collision
    if (obj.meta.collisionRadius > 0) {
      structures.push({
        x: placement.x,
        z: placement.z,
        radius: obj.meta.collisionRadius * (placement.scale ?? 1),
      });
    }
  }

  return { group, structures };
}
