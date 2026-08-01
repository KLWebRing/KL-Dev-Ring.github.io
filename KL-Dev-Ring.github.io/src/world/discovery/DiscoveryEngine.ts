// ── KL DevVerse — Discovery Engine ──────────────────────────────────
// Tracks player exploration — discovered landmarks, viewpoints, progress.
// Triggers discovery events when player enters landmark proximity.

import type { WorldSubsystem } from '@/world/engine/WorldEngine';
import type { WorldTimeState } from '@/world/engine/WorldClock';
import { worldEngine } from '@/world/engine/WorldEngine';
import { useDiscoveryStore } from './DiscoveryStore';

// ── Landmark Proximity Config ───────────────────────────────────────

const DISCOVERY_RADIUS = 5.0; // How close to landmark to trigger discovery

// ── Discovery Engine ────────────────────────────────────────────────

export class DiscoveryEngine implements WorldSubsystem {
  readonly name = 'DiscoveryEngine';

  // Known landmarks (populated by LandmarkRegistry)
  private landmarks: Array<{ id: string; x: number; z: number }> = [];

  // Throttle
  private updateTimer = 0;
  private static readonly UPDATE_INTERVAL = 1.0; // Check once per second

  // ── WorldSubsystem Interface ────────────────────────────────────

  update(dt: number, _worldTime: WorldTimeState): void {
    this.updateTimer += dt;
    if (this.updateTimer < DiscoveryEngine.UPDATE_INTERVAL) return;
    this.updateTimer = 0;

    this.checkProximity();
  }

  dispose(): void {
    this.landmarks = [];
  }

  // ── Landmark Registration ───────────────────────────────────────

  setLandmarks(landmarks: Array<{ id: string; x: number; z: number }>): void {
    this.landmarks = landmarks;
  }

  // ── Proximity Check ─────────────────────────────────────────────

  private checkProximity(): void {
    const pos = worldEngine.getPlayerPosition();
    const store = useDiscoveryStore.getState();

    for (const lm of this.landmarks) {
      if (store.isDiscovered(lm.id)) continue;

      const dx = pos.x - lm.x;
      const dz = pos.z - lm.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist <= DISCOVERY_RADIUS) {
        store.discoverLandmark(lm.id, this.landmarks.length);
        console.log(`[DiscoveryEngine] Discovered: ${lm.id}`);
      }
    }
  }
}
