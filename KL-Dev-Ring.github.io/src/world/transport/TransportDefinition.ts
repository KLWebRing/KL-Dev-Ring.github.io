// ── KL DevVerse — Transport Definition ──────────────────────────────
// Type definitions for the transportation system.
// Architecture only — no physics implementation yet.

// ── Transport Modes ─────────────────────────────────────────────────

export type TransportMode =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'scooter'
  | 'boat'
  | 'bus'
  ;

// ── Transport Config ────────────────────────────────────────────────

export interface TransportConfig {
  readonly mode: TransportMode;
  readonly label: string;
  /** Speed multiplier relative to walking */
  readonly speedMultiplier: number;
  /** Camera distance offset */
  readonly cameraOffset: number;
  /** Animation override */
  readonly animation: string;
  /** Whether this mode follows routes */
  readonly routeBased: boolean;
  /** Unlock condition */
  readonly unlockCondition: 'free' | 'discovery' | 'purchase';
}

export const TRANSPORT_CONFIGS: Readonly<Record<TransportMode, TransportConfig>> = {
  walking: {
    mode: 'walking',
    label: 'Walking',
    speedMultiplier: 1.0,
    cameraOffset: 0,
    animation: 'walk',
    routeBased: false,
    unlockCondition: 'free',
  },
  running: {
    mode: 'running',
    label: 'Running',
    speedMultiplier: 1.9,
    cameraOffset: 0.5,
    animation: 'run',
    routeBased: false,
    unlockCondition: 'free',
  },
  cycling: {
    mode: 'cycling',
    label: 'Bicycle',
    speedMultiplier: 2.5,
    cameraOffset: 1.0,
    animation: 'cycle',
    routeBased: false,
    unlockCondition: 'discovery',
  },
  scooter: {
    mode: 'scooter',
    label: 'Scooter',
    speedMultiplier: 3.5,
    cameraOffset: 1.5,
    animation: 'ride',
    routeBased: false,
    unlockCondition: 'purchase',
  },
  boat: {
    mode: 'boat',
    label: 'Country Boat',
    speedMultiplier: 2.0,
    cameraOffset: 2.0,
    animation: 'row',
    routeBased: true,
    unlockCondition: 'discovery',
  },
  bus: {
    mode: 'bus',
    label: 'KSRTC Bus',
    speedMultiplier: 4.0,
    cameraOffset: 3.0,
    animation: 'sit',
    routeBased: true,
    unlockCondition: 'free',
  },
};
