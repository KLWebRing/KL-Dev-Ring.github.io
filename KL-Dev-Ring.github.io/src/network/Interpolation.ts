// ── KL DevVerse — Interpolation System ───────────────────────────────
// Smoothly interpolates remote player positions between server snapshots.
// Renders at serverTime - INTERPOLATION_DELAY_MS for consistent smoothness.

import type { RemotePlayerSnapshot } from '@/shared/types';
import { NETWORK } from '@shared/constants';
import { lerp, lerpAngle, clamp } from '@/shared/math';

/**
 * Interpolation buffer for a single remote player.
 * Stores the last N snapshots and lerps between them.
 */
export class InterpolationBuffer {
  private readonly buffer: RemotePlayerSnapshot[] = [];
  private readonly maxSize: number = NETWORK.INTERPOLATION_BUFFER_SIZE + 2; // Keep a few extra

  /** Add a new snapshot from the server */
  push(snapshot: RemotePlayerSnapshot): void {
    this.buffer.push(snapshot);

    // Keep buffer bounded
    while (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /** Get interpolated state at the given render time */
  interpolate(renderTime: number): {
    x: number;
    y: number;
    z: number;
    yaw: number;
    animState: string;
  } | null {
    if (this.buffer.length < 2) {
      // Not enough data — return latest or null
      const last = this.buffer[this.buffer.length - 1];
      return last
        ? { x: last.x, y: last.y, z: last.z, yaw: last.yaw, animState: last.animState }
        : null;
    }

    // Find the two snapshots to interpolate between
    // renderTime should be server time minus interpolation delay
    let from: RemotePlayerSnapshot | null = null;
    let to: RemotePlayerSnapshot | null = null;

    for (let i = 0; i < this.buffer.length - 1; i++) {
      const a = this.buffer[i]!;
      const b = this.buffer[i + 1]!;

      if (renderTime >= a.timestamp && renderTime <= b.timestamp) {
        from = a;
        to = b;
        break;
      }
    }

    // If renderTime is ahead of all snapshots, extrapolate from last two
    if (!from || !to) {
      const last = this.buffer[this.buffer.length - 1]!;
      const prev = this.buffer[this.buffer.length - 2]!;
      from = prev;
      to = last;
    }

    // Calculate interpolation factor
    const range = to.timestamp - from.timestamp;
    const t = range > 0
      ? clamp((renderTime - from.timestamp) / range, 0, 1.5) // Allow slight extrapolation
      : 1;

    return {
      x: lerp(from.x, to.x, t),
      y: lerp(from.y, to.y, t),
      z: lerp(from.z, to.z, t),
      yaw: lerpAngle(from.yaw, to.yaw, t),
      animState: t >= 0.5 ? to.animState : from.animState,
    };
  }

  /** Get the number of buffered snapshots */
  get size(): number {
    return this.buffer.length;
  }

  /** Clear the buffer */
  clear(): void {
    this.buffer.length = 0;
  }
}
