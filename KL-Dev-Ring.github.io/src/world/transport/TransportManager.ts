// ── KL DevVerse — Transport Manager ─────────────────────────────────
// State machine for current transport mode.
// Modifies player speed/animation based on active mode.
// Architecture only — vehicle rendering is future work.

import { TRANSPORT_CONFIGS, type TransportMode, type TransportConfig } from './TransportDefinition';

export class TransportManager {
  private currentMode: TransportMode = 'walking';
  private unlockedModes: Set<TransportMode> = new Set(['walking', 'running']);

  // ── Mode Switching ──────────────────────────────────────────────

  setMode(mode: TransportMode): boolean {
    if (!this.unlockedModes.has(mode)) {
      console.warn(`[TransportManager] Mode "${mode}" is locked`);
      return false;
    }

    this.currentMode = mode;
    console.log(`[TransportManager] Switched to: ${TRANSPORT_CONFIGS[mode].label}`);
    return true;
  }

  getCurrentMode(): TransportMode {
    return this.currentMode;
  }

  getCurrentConfig(): TransportConfig {
    return TRANSPORT_CONFIGS[this.currentMode];
  }

  getSpeedMultiplier(): number {
    return TRANSPORT_CONFIGS[this.currentMode].speedMultiplier;
  }

  getCameraOffset(): number {
    return TRANSPORT_CONFIGS[this.currentMode].cameraOffset;
  }

  // ── Unlock ──────────────────────────────────────────────────────

  unlockMode(mode: TransportMode): void {
    this.unlockedModes.add(mode);
    console.log(`[TransportManager] Unlocked: ${TRANSPORT_CONFIGS[mode].label}`);
  }

  isUnlocked(mode: TransportMode): boolean {
    return this.unlockedModes.has(mode);
  }

  getUnlockedModes(): TransportMode[] {
    return [...this.unlockedModes];
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  dispose(): void {
    this.currentMode = 'walking';
  }
}

export const transportManager = new TransportManager();
