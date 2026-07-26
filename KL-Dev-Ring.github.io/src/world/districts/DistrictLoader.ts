// ── KL DevVerse — District Loader ────────────────────────────────────
// Manages loading/unloading of district geometry based on player position.
// Works with DistrictRegistry to build districts on demand.

import { Scene } from 'three';
import { getEnabledDistricts, type DistrictId } from '@/world/engine/WorldConfig';
import {
  districtRegistry,
  type DistrictBuildContext,
  type DistrictBuildResult,
  type NPCEntry,
} from './DistrictRegistry';
import type { InteractableItem, Structure } from '@/shared/types';

// ── Loaded District State ───────────────────────────────────────────

interface LoadedDistrict {
  readonly id: DistrictId;
  readonly result: DistrictBuildResult;
}

// ── District Loader ─────────────────────────────────────────────────

export class DistrictLoader {
  private scene: Scene | null = null;
  private loadedDistricts = new Map<DistrictId, LoadedDistrict>();

  // Aggregate registries — filled from all loaded districts
  private allStructures: Structure[] = [];
  private allInteractables: InteractableItem[] = [];
  private allNPCs: NPCEntry[] = [];

  // Callbacks for when world data changes
  private onWorldDataChange: ((
    structures: Structure[],
    interactables: InteractableItem[],
    npcs: NPCEntry[],
  ) => void) | null = null;

  // ── Init ────────────────────────────────────────────────────────

  init(scene: Scene): void {
    this.scene = scene;
  }

  setOnWorldDataChange(
    callback: (structures: Structure[], interactables: InteractableItem[], npcs: NPCEntry[]) => void,
  ): void {
    this.onWorldDataChange = callback;
  }

  // ── Load Districts ──────────────────────────────────────────────

  /**
   * Load all enabled districts that have registered builders.
   * Called once at world startup.
   */
  loadAllEnabled(ctx: DistrictBuildContext): void {
    if (!this.scene) {
      console.warn('[DistrictLoader] Scene not initialized');
      return;
    }

    const enabled = getEnabledDistricts();

    for (const districtDef of enabled) {
      this.loadDistrict(districtDef.id, ctx);
    }

    this.rebuildAggregates();
  }

  /**
   * Load a single district by ID.
   */
  loadDistrict(id: DistrictId, ctx: DistrictBuildContext): boolean {
    if (!this.scene) return false;

    // Already loaded?
    if (this.loadedDistricts.has(id)) return true;

    // Has a builder?
    const builder = districtRegistry.get(id);
    if (!builder) {
      console.log(`[DistrictLoader] No builder registered for "${id}" — skipping`);
      return false;
    }

    // Build the district
    const result = builder(ctx);
    result.group.name = `district_${id}`;

    // Add to scene
    this.scene.add(result.group);

    // Track
    this.loadedDistricts.set(id, { id, result });

    console.log(`[DistrictLoader] Loaded district: ${id}`);
    return true;
  }

  /**
   * Unload a district by ID.
   */
  unloadDistrict(id: DistrictId): void {
    const loaded = this.loadedDistricts.get(id);
    if (!loaded || !this.scene) return;

    this.scene.remove(loaded.result.group);
    this.loadedDistricts.delete(id);
    this.rebuildAggregates();

    console.log(`[DistrictLoader] Unloaded district: ${id}`);
  }

  // ── Aggregates ──────────────────────────────────────────────────

  /**
   * Rebuild aggregate arrays from all loaded districts.
   * Called after any district load/unload.
   */
  private rebuildAggregates(): void {
    this.allStructures = [];
    this.allInteractables = [];
    this.allNPCs = [];

    for (const loaded of this.loadedDistricts.values()) {
      this.allStructures.push(...loaded.result.structures);
      this.allInteractables.push(...loaded.result.interactables);
      this.allNPCs.push(...loaded.result.npcs);
    }

    // Notify
    this.onWorldDataChange?.(this.allStructures, this.allInteractables, this.allNPCs);
  }

  // ── Getters ─────────────────────────────────────────────────────

  getStructures(): Structure[] {
    return this.allStructures;
  }

  getInteractables(): InteractableItem[] {
    return this.allInteractables;
  }

  getNPCs(): NPCEntry[] {
    return this.allNPCs;
  }

  getLoadedDistrict(id: DistrictId): DistrictBuildResult | null {
    return this.loadedDistricts.get(id)?.result ?? null;
  }

  isLoaded(id: DistrictId): boolean {
    return this.loadedDistricts.has(id);
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  dispose(): void {
    if (this.scene) {
      for (const loaded of this.loadedDistricts.values()) {
        this.scene.remove(loaded.result.group);
      }
    }
    this.loadedDistricts.clear();
    this.allStructures = [];
    this.allInteractables = [];
    this.allNPCs = [];
    this.onWorldDataChange = null;
    this.scene = null;
  }
}

// ── Singleton ───────────────────────────────────────────────────────

export const districtLoader = new DistrictLoader();
