// ── KL DevVerse — Ambient Audio Engine ──────────────────────────────
// Web Audio API based ambient sound system.
// Manages audio zones, crossfading, volume control.
//
// Architecture-ready — full zone routing built, but actual audio
// playback activates only when audio files are sourced (src URLs).

import { MathUtils } from 'three';
import type { WorldSubsystem } from '@/world/engine/WorldEngine';
import type { WorldTimeState } from '@/world/engine/WorldClock';
import { worldEngine } from '@/world/engine/WorldEngine';
import { AUDIO_ZONES, distanceToZoneEdge, type AudioZoneDef } from './AudioZone';

// ── Active Zone State ───────────────────────────────────────────────

interface ActiveZone {
  readonly zone: AudioZoneDef;
  /** Current volume multiplier (0..1, ramped) */
  volume: number;
  /** Target volume (based on distance) */
  targetVolume: number;
}

// ── Volume Settings ─────────────────────────────────────────────────

export interface VolumeSettings {
  master: number;   // 0..1
  ambient: number;  // 0..1
  sfx: number;      // 0..1
  music: number;    // 0..1
  muted: boolean;
}

const DEFAULT_VOLUME: VolumeSettings = {
  master: 0.7,
  ambient: 0.8,
  sfx: 1.0,
  music: 0.5,
  muted: false,
};

// ── Ambient Audio Engine ────────────────────────────────────────────

export class AmbientAudioEngine implements WorldSubsystem {
  readonly name = 'AmbientAudioEngine';

  // Volume settings
  private volume: VolumeSettings;

  // Active zones with current volumes
  private activeZones: ActiveZone[] = [];

  // Update throttle
  private updateTimer = 0;
  private static readonly UPDATE_INTERVAL = 0.25; // 4Hz

  // Volume ramp speed (per second)
  private static readonly RAMP_SPEED = 0.8;

  constructor() {
    // Load volume settings from localStorage
    this.volume = this.loadSettings();
  }

  // ── WorldSubsystem Interface ────────────────────────────────────

  update(dt: number, _worldTime: WorldTimeState): void {
    this.updateTimer += dt;
    if (this.updateTimer < AmbientAudioEngine.UPDATE_INTERVAL) return;
    this.updateTimer = 0;

    const playerPos = worldEngine.getPlayerPosition();
    this.updateZones(playerPos.x, playerPos.z, dt);
  }

  dispose(): void {
    this.activeZones = [];
    console.log('[AmbientAudioEngine] Disposed');
  }

  // ── Zone Processing ─────────────────────────────────────────────

  private updateZones(px: number, pz: number, dt: number): void {
    // Calculate target volumes for all zones
    for (const zoneDef of AUDIO_ZONES) {
      const edgeDist = distanceToZoneEdge(zoneDef, px, pz);

      let targetVolume = 0;
      if (edgeDist <= 0) {
        // Inside zone — full volume
        targetVolume = 1.0;
      } else if (edgeDist < zoneDef.fadeDistance) {
        // In fade range — linear falloff
        targetVolume = 1.0 - (edgeDist / zoneDef.fadeDistance);
      }

      // Find or create active zone entry
      let active = this.activeZones.find(az => az.zone.id === zoneDef.id);
      if (!active && targetVolume > 0) {
        active = { zone: zoneDef, volume: 0, targetVolume };
        this.activeZones.push(active);
      }

      if (active) {
        active.targetVolume = targetVolume;

        // Ramp volume
        const rampDelta = AmbientAudioEngine.RAMP_SPEED * dt;
        if (active.volume < active.targetVolume) {
          active.volume = Math.min(active.volume + rampDelta, active.targetVolume);
        } else {
          active.volume = Math.max(active.volume - rampDelta, active.targetVolume);
        }
      }
    }

    // Remove zones with zero volume
    this.activeZones = this.activeZones.filter(az => az.volume > 0.001);
  }

  // ── Volume Control ──────────────────────────────────────────────

  setMasterVolume(vol: number): void {
    this.volume.master = MathUtils.clamp(vol, 0, 1);
    this.saveSettings();
  }

  setAmbientVolume(vol: number): void {
    this.volume.ambient = MathUtils.clamp(vol, 0, 1);
    this.saveSettings();
  }

  setSFXVolume(vol: number): void {
    this.volume.sfx = MathUtils.clamp(vol, 0, 1);
    this.saveSettings();
  }

  setMusicVolume(vol: number): void {
    this.volume.music = MathUtils.clamp(vol, 0, 1);
    this.saveSettings();
  }

  toggleMute(): void {
    this.volume.muted = !this.volume.muted;
    this.saveSettings();
  }

  getVolumeSettings(): Readonly<VolumeSettings> {
    return { ...this.volume };
  }

  // ── Getters ─────────────────────────────────────────────────────

  /** Get currently active zones with their volumes */
  getActiveZones(): ReadonlyArray<{ id: string; label: string; volume: number }> {
    return this.activeZones.map(az => ({
      id: az.zone.id,
      label: az.zone.label,
      volume: az.volume,
    }));
  }

  // ── Persistence ─────────────────────────────────────────────────

  private loadSettings(): VolumeSettings {
    try {
      const stored = localStorage.getItem('kldevverse_audio');
      if (stored) {
        return { ...DEFAULT_VOLUME, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore
    }
    return { ...DEFAULT_VOLUME };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('kldevverse_audio', JSON.stringify(this.volume));
    } catch {
      // Ignore
    }
  }
}
