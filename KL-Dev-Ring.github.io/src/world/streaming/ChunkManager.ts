// ── KL DevVerse — Chunk Manager ─────────────────────────────────────
// Manages chunk-level streaming based on player position.
// Loads nearby chunks, unloads distant chunks — no loading screens.
//
// Currently operates as a WorldEngine subsystem.
// In Phase 4, chunks are used for spatial partitioning of world objects.
// Future: async loading, object pooling, LOD transitions.

import { CHUNK_CONFIG } from '@/world/engine/WorldConfig';
import { ChunkGrid, worldToChunk, type ChunkCoord } from './ChunkGrid';
import type { WorldSubsystem } from '@/world/engine/WorldEngine';
import type { WorldTimeState } from '@/world/engine/WorldClock';

// ── Chunk State ─────────────────────────────────────────────────────

export type ChunkState = 'empty' | 'loading' | 'loaded' | 'unloading';

export interface ChunkData {
  readonly coord: ChunkCoord;
  state: ChunkState;
  /** Timestamp of last state change (for debouncing) */
  lastStateChange: number;
}

// ── Chunk Manager ───────────────────────────────────────────────────

export class ChunkManager implements WorldSubsystem {
  readonly name = 'ChunkManager';

  private readonly grid = new ChunkGrid<ChunkData>();

  // Player chunk tracking
  private playerChunkX = Infinity;
  private playerChunkZ = Infinity;
  private needsUpdate = true;

  // Throttle — don't check every frame
  private updateTimer = 0;
  private static readonly UPDATE_INTERVAL = 0.5; // seconds

  // Listeners
  private chunkLoadListeners: Array<(coord: ChunkCoord) => void> = [];
  private chunkUnloadListeners: Array<(coord: ChunkCoord) => void> = [];

  // ── WorldSubsystem Interface ────────────────────────────────────

  update(dt: number, _worldTime: WorldTimeState): void {
    this.updateTimer += dt;
    if (this.updateTimer < ChunkManager.UPDATE_INTERVAL && !this.needsUpdate) return;
    this.updateTimer = 0;
    this.needsUpdate = false;

    this.processChunkUpdates();
  }

  dispose(): void {
    this.grid.clear();
    this.chunkLoadListeners.length = 0;
    this.chunkUnloadListeners.length = 0;
    console.log('[ChunkManager] Disposed');
  }

  // ── Player Position ─────────────────────────────────────────────

  /**
   * Update the player's chunk position.
   * Called by WorldEngine when the player moves.
   */
  updatePlayerChunk(worldX: number, worldZ: number): void {
    const { cx, cz } = worldToChunk(worldX, worldZ);

    if (cx !== this.playerChunkX || cz !== this.playerChunkZ) {
      this.playerChunkX = cx;
      this.playerChunkZ = cz;
      this.needsUpdate = true;
    }
  }

  // ── Core Streaming Logic ────────────────────────────────────────

  private processChunkUpdates(): void {
    if (this.playerChunkX === Infinity) return;

    const now = performance.now();

    // 1. Determine which chunks should be loaded
    const desiredChunks = this.grid.getChunksInRadius(
      this.playerChunkX,
      this.playerChunkZ,
      CHUNK_CONFIG.LOAD_RADIUS,
    );

    // 2. Load new chunks
    let loadsThisFrame = 0;
    for (const coord of desiredChunks) {
      if (!this.grid.has(coord.cx, coord.cz)) {
        if (loadsThisFrame >= CHUNK_CONFIG.MAX_LOADS_PER_FRAME) break;

        const chunkData: ChunkData = {
          coord,
          state: 'loaded',
          lastStateChange: now,
        };
        this.grid.set(coord.cx, coord.cz, chunkData);

        // Notify listeners
        for (const listener of this.chunkLoadListeners) {
          listener(coord);
        }

        loadsThisFrame++;
      }
    }

    // 3. Unload distant chunks
    const toUnload = this.grid.getChunksOutsideRadius(
      this.playerChunkX,
      this.playerChunkZ,
      CHUNK_CONFIG.UNLOAD_RADIUS,
    );

    for (const coord of toUnload) {
      this.grid.delete(coord.cx, coord.cz);

      // Notify listeners
      for (const listener of this.chunkUnloadListeners) {
        listener(coord);
      }
    }
  }

  // ── Queries ─────────────────────────────────────────────────────

  /** Check if a chunk is currently loaded */
  isChunkLoaded(cx: number, cz: number): boolean {
    return this.grid.has(cx, cz);
  }

  /** Check if a world position is in a loaded chunk */
  isPositionLoaded(worldX: number, worldZ: number): boolean {
    const { cx, cz } = worldToChunk(worldX, worldZ);
    return this.grid.has(cx, cz);
  }

  /** Get number of loaded chunks */
  getLoadedCount(): number {
    return this.grid.size;
  }

  /** Get the player's current chunk coordinate */
  getPlayerChunk(): ChunkCoord {
    return { cx: this.playerChunkX, cz: this.playerChunkZ };
  }

  /** Get all currently loaded chunk coordinates */
  getLoadedChunks(): ChunkCoord[] {
    return this.grid.keys();
  }

  // ── Events ──────────────────────────────────────────────────────

  onChunkLoad(listener: (coord: ChunkCoord) => void): () => void {
    this.chunkLoadListeners.push(listener);
    return () => {
      const idx = this.chunkLoadListeners.indexOf(listener);
      if (idx >= 0) this.chunkLoadListeners.splice(idx, 1);
    };
  }

  onChunkUnload(listener: (coord: ChunkCoord) => void): () => void {
    this.chunkUnloadListeners.push(listener);
    return () => {
      const idx = this.chunkUnloadListeners.indexOf(listener);
      if (idx >= 0) this.chunkUnloadListeners.splice(idx, 1);
    };
  }
}
