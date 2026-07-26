// ── KL DevVerse — World Clock ────────────────────────────────────────
// 24-hour world time simulation.
// Drives day/night, weather transitions, NPC schedules, street lights.
//
// Default: 1 real minute = 1 game hour (24 real minutes = full cycle).
// Configurable via TIME_SCALE.

// ── Time-of-day phases ──────────────────────────────────────────────

export type TimePhase =
  | 'dawn'         // 05:00 – 07:00
  | 'morning'      // 07:00 – 11:00
  | 'noon'         // 11:00 – 13:00
  | 'afternoon'    // 13:00 – 16:00
  | 'golden_hour'  // 16:00 – 18:00
  | 'sunset'       // 18:00 – 19:30
  | 'dusk'         // 19:30 – 20:30
  | 'night'        // 20:30 – 05:00
  ;

export interface WorldTimeState {
  /** 0..24 continuous float (e.g. 14.5 = 2:30 PM) */
  readonly hour: number;
  /** Current time phase */
  readonly phase: TimePhase;
  /** 0..1 normalized progress through the entire day */
  readonly dayProgress: number;
  /** 0..1 sun altitude (0 = horizon, 1 = zenith) */
  readonly sunAltitude: number;
  /** Is it dark enough for street lights? */
  readonly isNight: boolean;
}

// ── Phase boundaries ────────────────────────────────────────────────

interface PhaseBoundary {
  readonly start: number;  // hour
  readonly end: number;    // hour
  readonly phase: TimePhase;
}

const PHASE_TABLE: readonly PhaseBoundary[] = [
  { start: 5.0,  end: 7.0,   phase: 'dawn' },
  { start: 7.0,  end: 11.0,  phase: 'morning' },
  { start: 11.0, end: 13.0,  phase: 'noon' },
  { start: 13.0, end: 16.0,  phase: 'afternoon' },
  { start: 16.0, end: 18.0,  phase: 'golden_hour' },
  { start: 18.0, end: 19.5,  phase: 'sunset' },
  { start: 19.5, end: 20.5,  phase: 'dusk' },
  // Night wraps: 20.5 → 5.0
] as const;

function getPhase(hour: number): TimePhase {
  for (const pb of PHASE_TABLE) {
    if (hour >= pb.start && hour < pb.end) return pb.phase;
  }
  return 'night';
}

function getSunAltitude(hour: number): number {
  // Sun rises at 6, peaks at 12, sets at 18
  // Model as a sine curve: altitude = sin(π * (hour - 6) / 12)
  if (hour < 5.5 || hour > 18.5) return 0;
  const t = (hour - 5.5) / 13.0; // 0..1 from 5:30 to 18:30
  return Math.max(0, Math.sin(t * Math.PI));
}

// ── World Clock ─────────────────────────────────────────────────────

export class WorldClock {
  /** Game hours per real second. Default: 1/60 = 1 game hour per real minute */
  private timeScale: number;

  /** Current game hour (0..24) */
  private currentHour: number;

  /** Listeners for phase changes */
  private phaseListeners: Array<(phase: TimePhase, hour: number) => void> = [];
  private lastPhase: TimePhase;

  /** Paused state */
  private paused = false;

  constructor(options?: {
    startHour?: number;
    timeScale?: number;
  }) {
    this.currentHour = options?.startHour ?? 8.0; // Start at 8 AM
    this.timeScale = options?.timeScale ?? (1.0 / 60.0); // 1 game hour per real minute
    this.lastPhase = getPhase(this.currentHour);
  }

  // ── Update ──────────────────────────────────────────────────────

  /** Call every frame with delta time in seconds */
  update(dt: number): void {
    if (this.paused) return;

    // Advance time: dt is real seconds, timeScale is game-hours per real-second
    this.currentHour += dt * this.timeScale;

    // Wrap at 24
    if (this.currentHour >= 24.0) {
      this.currentHour -= 24.0;
    }

    // Check for phase change
    const newPhase = getPhase(this.currentHour);
    if (newPhase !== this.lastPhase) {
      this.lastPhase = newPhase;
      for (const listener of this.phaseListeners) {
        listener(newPhase, this.currentHour);
      }
    }
  }

  // ── Getters ─────────────────────────────────────────────────────

  getState(): WorldTimeState {
    const hour = this.currentHour;
    return {
      hour,
      phase: getPhase(hour),
      dayProgress: hour / 24.0,
      sunAltitude: getSunAltitude(hour),
      isNight: hour < 5.5 || hour >= 19.5,
    };
  }

  getHour(): number {
    return this.currentHour;
  }

  getPhase(): TimePhase {
    return getPhase(this.currentHour);
  }

  isNight(): boolean {
    return this.currentHour < 5.5 || this.currentHour >= 19.5;
  }

  /** Get formatted time string (e.g. "2:30 PM") */
  getFormattedTime(): string {
    const h = Math.floor(this.currentHour);
    const m = Math.floor((this.currentHour - h) * 60);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  }

  // ── Setters ─────────────────────────────────────────────────────

  setHour(hour: number): void {
    this.currentHour = ((hour % 24) + 24) % 24;
    this.lastPhase = getPhase(this.currentHour);
  }

  setTimeScale(scale: number): void {
    this.timeScale = scale;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  // ── Events ──────────────────────────────────────────────────────

  onPhaseChange(listener: (phase: TimePhase, hour: number) => void): () => void {
    this.phaseListeners.push(listener);
    return () => {
      const idx = this.phaseListeners.indexOf(listener);
      if (idx >= 0) this.phaseListeners.splice(idx, 1);
    };
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  dispose(): void {
    this.phaseListeners.length = 0;
  }
}
