// ── KL DevVerse — World Engine ───────────────────────────────────────
// Central lifecycle manager for the Living World.
// Coordinates: time, weather, districts, streaming, audio, events.
//
// Called once per frame from GameEngine's useFrame.
// All subsystems are lazy — they only activate when their module is loaded.

import { WorldClock, type TimePhase, type WorldTimeState } from './WorldClock';
import {
  WORLD_CLOCK_CONFIG,
  getDistrictAt,
  type DistrictId,
  type DistrictDefinition,
} from './WorldConfig';
import { ChunkManager } from '@/world/streaming/ChunkManager';
import { DayNightEngine } from '@/world/time/DayNightEngine';
import { Scene } from 'three';

// ── Subsystem Interfaces ────────────────────────────────────────────
// These interfaces define the contract for future subsystems.
// Each subsystem registers itself with the WorldEngine.

export interface WorldSubsystem {
  readonly name: string;
  update(dt: number, worldTime: WorldTimeState): void;
  dispose(): void;
}

// ── World Engine ────────────────────────────────────────────────────

export class WorldEngine {
  private readonly clock: WorldClock;
  private readonly subsystems: WorldSubsystem[] = [];
  private readonly chunkManager: ChunkManager;
  private readonly dayNight: DayNightEngine;

  // Player tracking
  private playerX = 0;
  private playerZ = 0;
  private currentDistrictId: DistrictId | null = null;
  private currentDistrict: DistrictDefinition | null = null;

  // Listeners
  private districtChangeListeners: Array<(
    newDistrict: DistrictDefinition | null,
    oldDistrict: DistrictDefinition | null,
  ) => void> = [];

  // State
  private initialized = false;

  constructor() {
    this.clock = new WorldClock({
      startHour: WORLD_CLOCK_CONFIG.START_HOUR,
      timeScale: WORLD_CLOCK_CONFIG.TIME_SCALE,
    });

    // Create chunk manager (registered as subsystem on init)
    this.chunkManager = new ChunkManager();
    this.dayNight = new DayNightEngine();
  }

  // ── Initialization ──────────────────────────────────────────────

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Log phase changes for debugging
    this.clock.onPhaseChange((phase: TimePhase, _hour: number) => {
      console.log(`[WorldEngine] Time phase: ${phase} (${this.clock.getFormattedTime()})`);
    });

    // Register built-in subsystems
    this.registerSubsystem(this.chunkManager);
    this.registerSubsystem(this.dayNight);

    console.log('[WorldEngine] Initialized');
  }

  /**
   * Bind to the Three.js scene so DayNightEngine can find lights.
   * Called from GameEngine after scene setup.
   */
  initScene(scene: Scene): void {
    this.dayNight.init(scene);
  }

  // ── Frame Update ────────────────────────────────────────────────

  /**
   * Called every frame from GameEngine's useFrame.
   * @param dt - Delta time in seconds (capped at 0.1)
   */
  update(dt: number): void {
    if (!this.initialized) return;

    // Advance world clock
    this.clock.update(dt);

    // Get current time state for subsystems
    const timeState = this.clock.getState();

    // Update all registered subsystems
    for (const subsystem of this.subsystems) {
      subsystem.update(dt, timeState);
    }
  }

  // ── Player Position Tracking ────────────────────────────────────

  /**
   * Called when the player position updates.
   * Checks for district boundary crossings.
   */
  updatePlayerPosition(x: number, z: number): void {
    this.playerX = x;
    this.playerZ = z;

    // Update chunk streaming
    this.chunkManager.updatePlayerChunk(x, z);

    // Check district boundary
    const district = getDistrictAt(x, z);
    const newId = district?.id ?? null;

    if (newId !== this.currentDistrictId) {
      const oldDistrict = this.currentDistrict;
      this.currentDistrictId = newId;
      this.currentDistrict = district;

      // Notify listeners
      for (const listener of this.districtChangeListeners) {
        listener(district, oldDistrict);
      }

      if (district) {
        console.log(`[WorldEngine] Entered district: ${district.name}`);
      } else {
        console.log('[WorldEngine] Left all districts (wilderness)');
      }
    }
  }

  // ── Subsystem Registration ──────────────────────────────────────

  registerSubsystem(subsystem: WorldSubsystem): void {
    this.subsystems.push(subsystem);
    console.log(`[WorldEngine] Registered subsystem: ${subsystem.name}`);
  }

  unregisterSubsystem(name: string): void {
    const idx = this.subsystems.findIndex(s => s.name === name);
    if (idx >= 0) {
      this.subsystems[idx]!.dispose();
      this.subsystems.splice(idx, 1);
    }
  }

  // ── Getters ─────────────────────────────────────────────────────

  getClock(): WorldClock {
    return this.clock;
  }

  getTimeState(): WorldTimeState {
    return this.clock.getState();
  }

  getCurrentDistrict(): DistrictDefinition | null {
    return this.currentDistrict;
  }

  getCurrentDistrictId(): DistrictId | null {
    return this.currentDistrictId;
  }

  getPlayerPosition(): { x: number; z: number } {
    return { x: this.playerX, z: this.playerZ };
  }

  // ── Events ──────────────────────────────────────────────────────

  onDistrictChange(
    listener: (newDistrict: DistrictDefinition | null, oldDistrict: DistrictDefinition | null) => void,
  ): () => void {
    this.districtChangeListeners.push(listener);
    return () => {
      const idx = this.districtChangeListeners.indexOf(listener);
      if (idx >= 0) this.districtChangeListeners.splice(idx, 1);
    };
  }

  onPhaseChange(listener: (phase: TimePhase, hour: number) => void): () => void {
    return this.clock.onPhaseChange(listener);
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  dispose(): void {
    for (const subsystem of this.subsystems) {
      subsystem.dispose();
    }
    this.subsystems.length = 0;
    this.districtChangeListeners.length = 0;
    this.clock.dispose();
    this.initialized = false;
    console.log('[WorldEngine] Disposed');
  }
}

// ── Singleton ───────────────────────────────────────────────────────

export const worldEngine = new WorldEngine();
