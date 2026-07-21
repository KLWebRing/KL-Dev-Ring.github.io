// ── KL DevVerse — Math Utilities ─────────────────────────────────────
// Pure math helpers used across the entire application.
// Ported from the existing seeded() and pickColor() functions.

/**
 * Deterministic pseudo-random number from a string value and salt.
 * Returns a value in [0, 1). Same input always produces the same output.
 * Uses FNV-1a hash internally.
 */
export function seeded(value: string, salt: number = 0): number {
  let hash = 2166136261 + salt * 101;
  for (const char of value) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  }
  return ((hash >>> 0) % 10000) / 10000;
}

/**
 * Pick a color from a list using a seeded value.
 * Safely wraps the value to avoid out-of-bounds access.
 */
export function pickColor<T>(val: number, list: readonly T[]): T {
  const normalized = ((val % 1) + 1) % 1;
  const idx = Math.floor(normalized * list.length);
  return list[idx] as T;
}

/**
 * Horizontal (XZ plane) distance between two points.
 */
export function distanceXZ(
  x1: number, z1: number,
  x2: number, z2: number,
): number {
  const dx = x1 - x2;
  const dz = z1 - z2;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Normalize an angle to [-PI, PI].
 */
export function normalizeAngle(angle: number): number {
  let result = angle;
  while (result < -Math.PI) result += Math.PI * 2;
  while (result > Math.PI) result -= Math.PI * 2;
  return result;
}

/**
 * Smoothly interpolate towards a target angle at a given speed factor.
 * Returns the new angle.
 */
export function lerpAngle(
  current: number,
  target: number,
  factor: number,
): number {
  const diff = normalizeAngle(target - current);
  return current + diff * factor;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two numbers.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
