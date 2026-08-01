// ── KL DevVerse — Weather Engine ────────────────────────────────────
// WorldEngine subsystem — state machine that manages weather transitions.
//
// State machine: Sunny → Cloudy → Rain → HeavyMonsoon → Fog (weighted)
// Smooth transitions: LERP between presets over WEATHER_BLEND_DURATION.
// Per-district weather modifiers applied on top.
// Controls rain particles, fog density, ambient multipliers.

import { Scene, MathUtils } from 'three';
import type { WorldSubsystem } from '@/world/engine/WorldEngine';
import type { WorldTimeState } from '@/world/engine/WorldClock';
import { worldEngine } from '@/world/engine/WorldEngine';
import {
  type WeatherType,
  type WeatherPreset,
  WEATHER_PRESETS,
  WEATHER_BLEND_DURATION,
  pickNextWeather,
  getMinDuration,
} from './WeatherState';
import { RainParticleSystem } from './WeatherParticles';

// ── Weather Engine ──────────────────────────────────────────────────

export class WeatherEngine implements WorldSubsystem {
  readonly name = 'WeatherEngine';

  // Scene reference
  private scene: Scene | null = null;

  // Current state
  private currentWeather: WeatherType = 'sunny';
  private currentPreset: WeatherPreset = WEATHER_PRESETS.sunny;

  // Transition blending
  private targetWeather: WeatherType | null = null;
  private targetPreset: WeatherPreset | null = null;
  private blendProgress = 0; // 0..1
  private blending = false;

  // Timers
  private stateTimer = 0;       // How long in current state
  private checkInterval = 30;   // Seconds between weather change checks
  private checkTimer = 0;

  // Particle systems
  private rain: RainParticleSystem;

  // Effective values (after blending)
  private effectiveFogMultiplier = 1.0;
  private effectiveAmbientMultiplier = 1.0;
  private effectiveRainIntensity = 0;
  private effectiveWindStrength = 0;

  constructor() {
    this.rain = new RainParticleSystem();
  }

  // ── Init ────────────────────────────────────────────────────────

  init(scene: Scene): void {
    this.scene = scene;
    this.rain.init(scene);
    console.log(`[WeatherEngine] Initialized — starting weather: ${this.currentWeather}`);
  }

  // ── WorldSubsystem Interface ────────────────────────────────────

  update(dt: number, _worldTime: WorldTimeState): void {
    if (!this.scene) return;

    this.stateTimer += dt;
    this.checkTimer += dt;

    // Periodically check for weather changes
    if (!this.blending && this.checkTimer >= this.checkInterval) {
      this.checkTimer = 0;
      this.maybeTransition();
    }

    // Process active blend
    if (this.blending) {
      this.blendProgress += dt / WEATHER_BLEND_DURATION;

      if (this.blendProgress >= 1.0) {
        // Blend complete
        this.blendProgress = 1.0;
        this.blending = false;
        this.currentWeather = this.targetWeather!;
        this.currentPreset = this.targetPreset!;
        this.targetWeather = null;
        this.targetPreset = null;
        this.stateTimer = 0;

        console.log(`[WeatherEngine] Weather changed to: ${this.currentWeather}`);
      }
    }

    // Calculate effective values
    this.calculateEffectiveValues();

    // Update particle systems
    const playerPos = worldEngine.getPlayerPosition();
    this.rain.setPlayerPosition(playerPos.x, playerPos.z);
    this.rain.setIntensity(this.effectiveRainIntensity);
    this.rain.setWind(this.effectiveWindStrength);
    this.rain.update(dt);
  }

  dispose(): void {
    if (this.scene) {
      this.rain.dispose(this.scene);
    }
    this.scene = null;
    console.log('[WeatherEngine] Disposed');
  }

  // ── Transition Logic ────────────────────────────────────────────

  private maybeTransition(): void {
    const minDuration = getMinDuration(this.currentWeather);

    // Don't transition too quickly
    if (this.stateTimer < minDuration) return;

    // Random chance to transition (higher the longer we've been in this state)
    const chance = Math.min(0.3, (this.stateTimer - minDuration) / 300);
    if (Math.random() > chance) return;

    // Pick next weather
    const next = pickNextWeather(this.currentWeather);
    if (next === this.currentWeather) return;

    this.startTransition(next);
  }

  private startTransition(target: WeatherType): void {
    this.targetWeather = target;
    this.targetPreset = WEATHER_PRESETS[target];
    this.blendProgress = 0;
    this.blending = true;

    console.log(`[WeatherEngine] Transitioning: ${this.currentWeather} → ${target}`);
  }

  // ── Effective Value Calculation ─────────────────────────────────

  private calculateEffectiveValues(): void {
    const t = this.blending ? this.smoothBlend(this.blendProgress) : 0;
    const from = this.currentPreset;
    const to = this.targetPreset ?? from;

    this.effectiveFogMultiplier = MathUtils.lerp(from.fogMultiplier, to.fogMultiplier, t);
    this.effectiveAmbientMultiplier = MathUtils.lerp(from.ambientMultiplier, to.ambientMultiplier, t);
    this.effectiveRainIntensity = MathUtils.lerp(from.rainIntensity, to.rainIntensity, t);
    this.effectiveWindStrength = MathUtils.lerp(from.windStrength, to.windStrength, t);
  }

  /** Smooth step for natural-feeling transitions */
  private smoothBlend(t: number): number {
    return t * t * (3 - 2 * t);
  }

  // ── Public API ──────────────────────────────────────────────────

  /** Force a weather change (for debugging / events) */
  forceWeather(type: WeatherType): void {
    this.startTransition(type);
  }

  /** Get current weather type */
  getCurrentWeather(): WeatherType {
    return this.currentWeather;
  }

  /** Get target weather (if transitioning) */
  getTargetWeather(): WeatherType | null {
    return this.targetWeather;
  }

  /** Is a weather transition in progress? */
  isTransitioning(): boolean {
    return this.blending;
  }

  /** Get the effective fog multiplier (for DayNightEngine to use) */
  getFogMultiplier(): number {
    return this.effectiveFogMultiplier;
  }

  /** Get the effective ambient multiplier */
  getAmbientMultiplier(): number {
    return this.effectiveAmbientMultiplier;
  }
}
