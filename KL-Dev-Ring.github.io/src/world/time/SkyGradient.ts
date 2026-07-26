// ── KL DevVerse — Sky Gradient ──────────────────────────────────────
// Procedural sky color interpolation between time-of-day presets.
// Uses smooth HSL-based blending for natural color transitions.

import { Color } from 'three';
import type { TimePhase } from '@/world/engine/WorldClock';
import { TIME_LIGHTING, type TimeLightingPreset } from '@/world/engine/WorldConfig';

// Phase order for reference:
// night → dawn → morning → noon → afternoon → golden_hour → sunset → dusk → night

// Map hour → which two phases to blend between, and blend factor (0..1)
interface PhaseBlend {
  readonly from: TimePhase;
  readonly to: TimePhase;
  readonly t: number;  // 0 = fully "from", 1 = fully "to"
}

/**
 * Given a continuous hour (0..24), determine which two time phases
 * to blend between and the interpolation factor.
 */
export function getPhaseBlend(hour: number): PhaseBlend {
  // Define transition midpoints (hour at which each phase is at full strength)
  const keyframes: Array<{ hour: number; phase: TimePhase }> = [
    { hour: 2.5,  phase: 'night' },
    { hour: 6.0,  phase: 'dawn' },
    { hour: 9.0,  phase: 'morning' },
    { hour: 12.0, phase: 'noon' },
    { hour: 14.5, phase: 'afternoon' },
    { hour: 17.0, phase: 'golden_hour' },
    { hour: 18.75, phase: 'sunset' },
    { hour: 20.0, phase: 'dusk' },
    { hour: 22.5, phase: 'night' },  // wrap point
  ];

  // Normalize hour to 0..24
  const h = ((hour % 24) + 24) % 24;

  // Find surrounding keyframes
  for (let i = 0; i < keyframes.length - 1; i++) {
    const curr = keyframes[i]!;
    const next = keyframes[i + 1]!;

    if (h >= curr.hour && h < next.hour) {
      const t = (h - curr.hour) / (next.hour - curr.hour);
      return { from: curr.phase, to: next.phase, t: smoothstep(t) };
    }
  }

  // Before first keyframe → night to night (early morning)
  return { from: 'night', to: 'night', t: 0 };
}

/**
 * Get the interpolated lighting preset for a given hour.
 */
export function getInterpolatedLighting(hour: number): TimeLightingPreset {
  const blend = getPhaseBlend(hour);
  const fromPreset = TIME_LIGHTING[blend.from];
  const toPreset = TIME_LIGHTING[blend.to];

  return lerpPreset(fromPreset, toPreset, blend.t);
}

// ── Color Helpers ───────────────────────────────────────────────────

const _colorA = new Color();
const _colorB = new Color();
const _colorResult = new Color();

/** Lerp between two hex colors using Three.js Color (linear RGB space) */
export function lerpColor(a: number, b: number, t: number): number {
  _colorA.set(a);
  _colorB.set(b);
  _colorResult.copy(_colorA).lerp(_colorB, t);
  return _colorResult.getHex();
}

/** Lerp between two lighting presets */
function lerpPreset(a: TimeLightingPreset, b: TimeLightingPreset, t: number): TimeLightingPreset {
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

/** Smooth step function for natural transitions */
function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}
