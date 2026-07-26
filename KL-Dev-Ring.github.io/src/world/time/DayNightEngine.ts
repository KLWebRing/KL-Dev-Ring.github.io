// ── KL DevVerse — Day/Night Engine ──────────────────────────────────
// WorldEngine subsystem that dynamically updates scene lighting,
// sky color, fog, and sun position based on the world clock.
//
// Reads time from WorldClock → interpolates lighting presets →
// applies to Three.js scene objects (DirectionalLight, AmbientLight,
// fog, background, sun position).

import {
  Scene, DirectionalLight, AmbientLight, FogExp2, Color,
  MathUtils,
} from 'three';
import type { WorldSubsystem } from '@/world/engine/WorldEngine';
import type { WorldTimeState } from '@/world/engine/WorldClock';
import { getInterpolatedLighting } from './SkyGradient';
import { applyDistrictLighting } from './LightingProfile';
import { worldEngine } from '@/world/engine/WorldEngine';
import type { TimeLightingPreset } from '@/world/engine/WorldConfig';

// ── Sun Orbit Parameters ────────────────────────────────────────────

const SUN_ORBIT = {
  /** Distance from origin */
  RADIUS: 80,
  /** Maximum height at noon */
  MAX_HEIGHT: 60,
  /** Orbit tilt (radians) — slight north-south offset */
  TILT: 0.15,
} as const;

// ── Day/Night Engine ────────────────────────────────────────────────

export class DayNightEngine implements WorldSubsystem {
  readonly name = 'DayNightEngine';

  // Scene references (set during init)
  private scene: Scene | null = null;
  private sun: DirectionalLight | null = null;
  private ambient: AmbientLight | null = null;

  // Internal color objects (reused to avoid allocations)
  private readonly _skyColor = new Color();
  private readonly _fogColor = new Color();
  private readonly _sunColor = new Color();
  private readonly _ambientColor = new Color();

  // Current applied preset (for smooth transitions)
  private currentPreset: TimeLightingPreset | null = null;

  // Update throttle — lighting doesn't need 60Hz updates
  private updateTimer = 0;
  private static readonly UPDATE_INTERVAL = 0.1; // 10Hz

  // ── Initialization ──────────────────────────────────────────────

  /**
   * Bind to the Three.js scene.
   * Finds existing sun and ambient lights by traversal.
   */
  init(scene: Scene): void {
    this.scene = scene;

    // Find the DirectionalLight (sun) and AmbientLight
    scene.traverse((obj) => {
      if (obj instanceof DirectionalLight && !this.sun) {
        this.sun = obj;
      }
      if (obj instanceof AmbientLight && !this.ambient) {
        this.ambient = obj;
      }
    });

    if (!this.sun) {
      console.warn('[DayNightEngine] No DirectionalLight found in scene');
    }
    if (!this.ambient) {
      console.warn('[DayNightEngine] No AmbientLight found in scene');
    }

    console.log('[DayNightEngine] Initialized');
  }

  // ── WorldSubsystem Interface ────────────────────────────────────

  update(dt: number, worldTime: WorldTimeState): void {
    if (!this.scene) return;

    this.updateTimer += dt;
    if (this.updateTimer < DayNightEngine.UPDATE_INTERVAL) return;
    this.updateTimer = 0;

    // Get interpolated lighting for current time
    let preset = getInterpolatedLighting(worldTime.hour);

    // Apply district modifiers
    const district = worldEngine.getCurrentDistrict();
    preset = applyDistrictLighting(preset, district);

    this.currentPreset = preset;

    // Apply to scene
    this.applySky(preset);
    this.applyFog(preset);
    this.applySun(preset, worldTime);
    this.applyAmbient(preset);
  }

  dispose(): void {
    this.scene = null;
    this.sun = null;
    this.ambient = null;
    this.currentPreset = null;
    console.log('[DayNightEngine] Disposed');
  }

  // ── Apply Functions ─────────────────────────────────────────────

  private applySky(preset: TimeLightingPreset): void {
    if (!this.scene) return;

    this._skyColor.set(preset.skyColor);

    if (this.scene.background instanceof Color) {
      this.scene.background.lerp(this._skyColor, 0.1);
    } else {
      this.scene.background = this._skyColor.clone();
    }
  }

  private applyFog(preset: TimeLightingPreset): void {
    if (!this.scene) return;

    this._fogColor.set(preset.fogColor);

    if (this.scene.fog instanceof FogExp2) {
      this.scene.fog.color.lerp(this._fogColor, 0.1);
      this.scene.fog.density = MathUtils.lerp(
        this.scene.fog.density,
        preset.fogDensity,
        0.1,
      );
    }
  }

  private applySun(preset: TimeLightingPreset, worldTime: WorldTimeState): void {
    if (!this.sun) return;

    // Color and intensity
    this._sunColor.set(preset.sunColor);
    this.sun.color.lerp(this._sunColor, 0.1);
    this.sun.intensity = MathUtils.lerp(this.sun.intensity, preset.sunIntensity, 0.1);

    // Sun position — orbital path based on time
    const hourAngle = ((worldTime.hour - 6) / 12) * Math.PI; // 0 at 6AM, π at 6PM
    const altitude = Math.max(0, Math.sin(hourAngle));

    const sunX = Math.cos(hourAngle) * SUN_ORBIT.RADIUS;
    const sunY = altitude * SUN_ORBIT.MAX_HEIGHT + 2; // never below 2
    const sunZ = Math.sin(SUN_ORBIT.TILT) * SUN_ORBIT.RADIUS * Math.cos(hourAngle);

    // Smooth interpolation of sun position
    this.sun.position.x = MathUtils.lerp(this.sun.position.x, sunX, 0.05);
    this.sun.position.y = MathUtils.lerp(this.sun.position.y, sunY, 0.05);
    this.sun.position.z = MathUtils.lerp(this.sun.position.z, sunZ, 0.05);

    // Shadow intensity scales with sun altitude
    this.sun.castShadow = altitude > 0.05;
  }

  private applyAmbient(preset: TimeLightingPreset): void {
    if (!this.ambient) return;

    this._ambientColor.set(preset.ambientColor);
    this.ambient.color.lerp(this._ambientColor, 0.1);
    this.ambient.intensity = MathUtils.lerp(
      this.ambient.intensity,
      preset.ambientIntensity,
      0.1,
    );
  }

  // ── Getters ─────────────────────────────────────────────────────

  getCurrentPreset(): TimeLightingPreset | null {
    return this.currentPreset;
  }
}
