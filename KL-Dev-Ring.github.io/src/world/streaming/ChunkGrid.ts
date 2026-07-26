// ── KL DevVerse — Chunk Grid ────────────────────────────────────────
// Spatial hash grid for fast object-to-chunk lookup.
// Divides the world into fixed-size cells and maps objects to cells.
//
// Used by ChunkManager to determine which chunks to load/unload
// and by future systems for spatial queries (nearest NPC, etc.).

import { CHUNK_CONFIG } from '@/world/engine/WorldConfig';

// ── Chunk Coordinate ────────────────────────────────────────────────

export interface ChunkCoord {
  readonly cx: number;  // chunk X index
  readonly cz: number;  // chunk Z index
}

// ── Chunk Key ───────────────────────────────────────────────────────

/** Compact string key for Map lookups */
export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function chunkKeyFromCoord(coord: ChunkCoord): string {
  return `${coord.cx},${coord.cz}`;
}

// ── World → Chunk Coordinate Conversion ─────────────────────────────

/** Convert a world position to chunk coordinates */
export function worldToChunk(worldX: number, worldZ: number): ChunkCoord {
  return {
    cx: Math.floor(worldX / CHUNK_CONFIG.SIZE),
    cz: Math.floor(worldZ / CHUNK_CONFIG.SIZE),
  };
}

/** Convert chunk coordinates to world position (center of chunk) */
export function chunkToWorld(cx: number, cz: number): { x: number; z: number } {
  return {
    x: cx * CHUNK_CONFIG.SIZE + CHUNK_CONFIG.SIZE / 2,
    z: cz * CHUNK_CONFIG.SIZE + CHUNK_CONFIG.SIZE / 2,
  };
}

/** Get the AABB bounds of a chunk in world space */
export function chunkBounds(cx: number, cz: number): {
  minX: number; minZ: number; maxX: number; maxZ: number;
} {
  return {
    minX: cx * CHUNK_CONFIG.SIZE,
    minZ: cz * CHUNK_CONFIG.SIZE,
    maxX: (cx + 1) * CHUNK_CONFIG.SIZE,
    maxZ: (cz + 1) * CHUNK_CONFIG.SIZE,
  };
}

// ── Chunk Grid ──────────────────────────────────────────────────────

/**
 * Spatial hash grid that maps chunk coordinates to arbitrary data.
 * Generic over T — can store Three.js Groups, object lists, metadata, etc.
 */
export class ChunkGrid<T> {
  private readonly cells = new Map<string, T>();

  /** Store data at a chunk coordinate */
  set(cx: number, cz: number, data: T): void {
    this.cells.set(chunkKey(cx, cz), data);
  }

  /** Get data at a chunk coordinate */
  get(cx: number, cz: number): T | undefined {
    return this.cells.get(chunkKey(cx, cz));
  }

  /** Check if a chunk has data */
  has(cx: number, cz: number): boolean {
    return this.cells.has(chunkKey(cx, cz));
  }

  /** Remove data at a chunk coordinate */
  delete(cx: number, cz: number): boolean {
    return this.cells.delete(chunkKey(cx, cz));
  }

  /** Get all chunk coordinates that have data */
  keys(): ChunkCoord[] {
    const result: ChunkCoord[] = [];
    for (const key of this.cells.keys()) {
      const parts = key.split(',');
      if (parts.length === 2) {
        result.push({ cx: parseInt(parts[0]!, 10), cz: parseInt(parts[1]!, 10) });
      }
    }
    return result;
  }

  /** Get all stored values */
  values(): T[] {
    return [...this.cells.values()];
  }

  /** Number of populated chunks */
  get size(): number {
    return this.cells.size;
  }

  /** Clear all data */
  clear(): void {
    this.cells.clear();
  }

  /**
   * Get all chunks within a radius (in chunk units) of a center chunk.
   * Returns chunk coordinates, not data.
   */
  getChunksInRadius(centerCx: number, centerCz: number, radius: number): ChunkCoord[] {
    const result: ChunkCoord[] = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        result.push({ cx: centerCx + dx, cz: centerCz + dz });
      }
    }
    return result;
  }

  /**
   * Get all populated chunks that are outside a radius of a center chunk.
   * Used for determining which chunks to unload.
   */
  getChunksOutsideRadius(centerCx: number, centerCz: number, radius: number): ChunkCoord[] {
    const result: ChunkCoord[] = [];
    for (const key of this.cells.keys()) {
      const parts = key.split(',');
      if (parts.length !== 2) continue;
      const cx = parseInt(parts[0]!, 10);
      const cz = parseInt(parts[1]!, 10);
      const dx = Math.abs(cx - centerCx);
      const dz = Math.abs(cz - centerCz);
      if (dx > radius || dz > radius) {
        result.push({ cx, cz });
      }
    }
    return result;
  }
}
