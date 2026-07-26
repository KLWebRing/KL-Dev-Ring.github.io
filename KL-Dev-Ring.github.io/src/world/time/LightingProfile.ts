// ── KL DevVerse — Lighting Profile ──────────────────────────────────
// Per-district lighting overrides applied on top of the global
// time-of-day lighting. Each district can tint, brighten, or fog-ify
// the base lighting to create distinct atmospheres.

import type { TimeLightingPreset } from '@/world/engine/WorldConfig';
import type { DistrictDefinition } from '@/world/engine/WorldConfig';
import { lerpColor } from './SkyGradient';

/**
 * Apply a district's lighting profile on top of the global time preset.
 * This modifies ambient intensity, fog density, and tints the ambient color.
 */
export function applyDistrictLighting(
  basePreset: TimeLightingPreset,
  district: DistrictDefinition | null,
): TimeLightingPreset {
  if (!district) return basePreset;

  const profile = district.lighting;

  return {
    skyColor: basePreset.skyColor,
    fogColor: basePreset.fogColor,
    fogDensity: basePreset.fogDensity * profile.fogMultiplier,
    sunColor: basePreset.sunColor,
    sunIntensity: basePreset.sunIntensity,
    ambientColor: lerpColor(basePreset.ambientColor, profile.ambientTint, 0.15),
    ambientIntensity: basePreset.ambientIntensity * profile.ambientMultiplier,
  };
}

/**
 * Smoothly interpolate between two district lighting states.
 * Used during district transitions so lighting doesn't pop.
 */
export function lerpDistrictLighting(
  a: TimeLightingPreset,
  b: TimeLightingPreset,
  t: number,
): TimeLightingPreset {
  const lerp = (v1: number, v2: number) => v1 + (v2 - v1) * t;

  return {
    skyColor: lerpColor(a.skyColor, b.skyColor, t),
    fogColor: lerpColor(a.fogColor, b.fogColor, t),
    fogDensity: lerp(a.fogDensity, b.fogDensity),
    sunColor: lerpColor(a.sunColor, b.sunColor, t),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity),
    ambientColor: lerpColor(a.ambientColor, b.ambientColor, t),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity),
  };
}
