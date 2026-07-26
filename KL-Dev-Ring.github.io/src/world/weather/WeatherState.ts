// ── KL DevVerse — Weather State ─────────────────────────────────────
// Type definitions, transition configs, and weather presets.
// Drives the WeatherEngine state machine.

// ── Weather Types ───────────────────────────────────────────────────

export type WeatherType =
  | 'sunny'
  | 'cloudy'
  | 'golden_hour'
  | 'rain'
  | 'heavy_monsoon'
  | 'fog'
  | 'night_clear'
  ;

// ── Weather Preset ──────────────────────────────────────────────────

export interface WeatherPreset {
  readonly type: WeatherType;
  /** Fog density multiplier (applied on top of time-of-day fog) */
  readonly fogMultiplier: number;
  /** Ambient intensity multiplier */
  readonly ambientMultiplier: number;
  /** Sky color tint (blended with time-of-day sky) */
  readonly skyTint: number;
  /** Tint blend strength (0 = no tint, 1 = full override) */
  readonly skyTintStrength: number;
  /** Rain particle intensity (0 = none, 1 = max) */
  readonly rainIntensity: number;
  /** Wind strength (affects particles, future vegetation) */
  readonly windStrength: number;
  /** Thunder probability per minute (0 = none) */
  readonly thunderChance: number;
}

// ── Presets ──────────────────────────────────────────────────────────

export const WEATHER_PRESETS: Readonly<Record<WeatherType, WeatherPreset>> = {
  sunny: {
    type: 'sunny',
    fogMultiplier: 0.8,
    ambientMultiplier: 1.1,
    skyTint: 0x87ceeb,
    skyTintStrength: 0.05,
    rainIntensity: 0,
    windStrength: 0.1,
    thunderChance: 0,
  },
  cloudy: {
    type: 'cloudy',
    fogMultiplier: 1.3,
    ambientMultiplier: 0.85,
    skyTint: 0x9ca3af,
    skyTintStrength: 0.25,
    rainIntensity: 0,
    windStrength: 0.3,
    thunderChance: 0,
  },
  golden_hour: {
    type: 'golden_hour',
    fogMultiplier: 1.0,
    ambientMultiplier: 0.95,
    skyTint: 0xffc870,
    skyTintStrength: 0.15,
    rainIntensity: 0,
    windStrength: 0.1,
    thunderChance: 0,
  },
  rain: {
    type: 'rain',
    fogMultiplier: 1.8,
    ambientMultiplier: 0.7,
    skyTint: 0x6b7280,
    skyTintStrength: 0.35,
    rainIntensity: 0.5,
    windStrength: 0.5,
    thunderChance: 0,
  },
  heavy_monsoon: {
    type: 'heavy_monsoon',
    fogMultiplier: 2.5,
    ambientMultiplier: 0.5,
    skyTint: 0x4b5563,
    skyTintStrength: 0.5,
    rainIntensity: 1.0,
    windStrength: 0.9,
    thunderChance: 0.3,
  },
  fog: {
    type: 'fog',
    fogMultiplier: 3.0,
    ambientMultiplier: 0.75,
    skyTint: 0xd1d5db,
    skyTintStrength: 0.4,
    rainIntensity: 0,
    windStrength: 0.05,
    thunderChance: 0,
  },
  night_clear: {
    type: 'night_clear',
    fogMultiplier: 0.7,
    ambientMultiplier: 1.0,
    skyTint: 0x0a0e1a,
    skyTintStrength: 0.0,
    rainIntensity: 0,
    windStrength: 0.05,
    thunderChance: 0,
  },
};

// ── Transition Rules ────────────────────────────────────────────────
// Defines valid state transitions and their probabilities.

export interface WeatherTransition {
  readonly from: WeatherType;
  readonly to: WeatherType;
  /** Relative weight (higher = more likely) */
  readonly weight: number;
  /** Minimum duration in current state before transition (seconds) */
  readonly minDuration: number;
}

export const WEATHER_TRANSITIONS: readonly WeatherTransition[] = [
  // Sunny can go to cloudy, golden_hour
  { from: 'sunny',        to: 'cloudy',       weight: 3, minDuration: 120 },
  { from: 'sunny',        to: 'golden_hour',  weight: 1, minDuration: 180 },
  { from: 'sunny',        to: 'fog',          weight: 1, minDuration: 240 },

  // Cloudy can go to rain, sunny, fog
  { from: 'cloudy',       to: 'rain',         weight: 3, minDuration: 60 },
  { from: 'cloudy',       to: 'sunny',        weight: 2, minDuration: 90 },
  { from: 'cloudy',       to: 'fog',          weight: 1, minDuration: 90 },

  // Rain can go to heavy monsoon, cloudy
  { from: 'rain',         to: 'heavy_monsoon', weight: 2, minDuration: 60 },
  { from: 'rain',         to: 'cloudy',        weight: 3, minDuration: 45 },

  // Heavy monsoon returns to rain or cloudy
  { from: 'heavy_monsoon', to: 'rain',    weight: 3, minDuration: 30 },
  { from: 'heavy_monsoon', to: 'cloudy',  weight: 2, minDuration: 45 },

  // Fog clears to cloudy or sunny
  { from: 'fog',          to: 'cloudy', weight: 2, minDuration: 90 },
  { from: 'fog',          to: 'sunny',  weight: 1, minDuration: 120 },

  // Golden hour goes to sunny or cloudy
  { from: 'golden_hour',  to: 'sunny',  weight: 2, minDuration: 60 },
  { from: 'golden_hour',  to: 'cloudy', weight: 1, minDuration: 60 },

  // Night clear
  { from: 'night_clear',  to: 'fog',    weight: 1, minDuration: 180 },
  { from: 'night_clear',  to: 'cloudy', weight: 1, minDuration: 180 },
];

// ── Transition Duration ─────────────────────────────────────────────

/** Duration of smooth blend between weather states (seconds) */
export const WEATHER_BLEND_DURATION = 15.0;

// ── Helper: pick next weather ───────────────────────────────────────

/**
 * Pick the next weather state based on transition weights.
 * Uses weighted random selection.
 */
export function pickNextWeather(current: WeatherType): WeatherType {
  const valid = WEATHER_TRANSITIONS.filter(t => t.from === current);
  if (valid.length === 0) return current;

  const totalWeight = valid.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const transition of valid) {
    roll -= transition.weight;
    if (roll <= 0) return transition.to;
  }

  return valid[valid.length - 1]!.to;
}

/**
 * Get the minimum duration for the current weather state.
 */
export function getMinDuration(current: WeatherType): number {
  const transitions = WEATHER_TRANSITIONS.filter(t => t.from === current);
  if (transitions.length === 0) return 120;
  return Math.min(...transitions.map(t => t.minDuration));
}
