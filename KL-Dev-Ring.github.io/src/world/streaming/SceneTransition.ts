// ── KL DevVerse — Scene Transition ──────────────────────────────────
// Manages smooth transitions between scenes (town ↔ studio ↔ future).
// Handles:
// - Fade-in/fade-out screen overlay
// - Camera repositioning
// - State cleanup between scenes
// - Loading indicator management

import type { ViewState } from '@/shared/types';

// ── Transition State ────────────────────────────────────────────────

export type TransitionPhase = 'idle' | 'fading_out' | 'loading' | 'fading_in';

export interface TransitionState {
  readonly phase: TransitionPhase;
  readonly from: ViewState | null;
  readonly to: ViewState | null;
  readonly progress: number; // 0..1
}

// ── Transition Config ───────────────────────────────────────────────

export interface TransitionConfig {
  /** Duration of fade-out in seconds */
  readonly fadeOutDuration: number;
  /** Duration of fade-in in seconds */
  readonly fadeInDuration: number;
  /** Minimum time to show loading state (prevents flicker) */
  readonly minLoadingTime: number;
}

const DEFAULT_CONFIG: TransitionConfig = {
  fadeOutDuration: 0.4,
  fadeInDuration: 0.6,
  minLoadingTime: 0.2,
};

// ── Scene Transition Manager ────────────────────────────────────────

export class SceneTransition {
  private config: TransitionConfig;
  private phase: TransitionPhase = 'idle';
  private from: ViewState | null = null;
  private to: ViewState | null = null;
  private timer = 0;
  private currentDuration = 0;

  // Callback when transition reaches the midpoint (screen is black)
  private onMidpoint: (() => void) | null = null;
  // Callback when transition completes
  private onComplete: (() => void) | null = null;

  // Reference to the screen overlay DOM element
  private overlay: HTMLElement | null = null;

  constructor(config?: Partial<TransitionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Init ────────────────────────────────────────────────────────

  init(): void {
    this.overlay = document.getElementById('screenOverlay');
  }

  // ── Start Transition ────────────────────────────────────────────

  /**
   * Begin a scene transition.
   * @param from - Current view state
   * @param to - Target view state
   * @param onMidpoint - Called when screen is fully black (time to swap scenes)
   * @param onComplete - Called when transition finishes
   */
  start(
    from: ViewState,
    to: ViewState,
    onMidpoint?: () => void,
    onComplete?: () => void,
  ): void {
    if (this.phase !== 'idle') {
      console.warn('[SceneTransition] Transition already in progress');
      return;
    }

    this.from = from;
    this.to = to;
    this.onMidpoint = onMidpoint ?? null;
    this.onComplete = onComplete ?? null;

    // Start fade-out
    this.phase = 'fading_out';
    this.timer = 0;
    this.currentDuration = this.config.fadeOutDuration;
  }

  // ── Update ──────────────────────────────────────────────────────

  /**
   * Call every frame with delta time.
   * Returns true if a transition is active.
   */
  update(dt: number): boolean {
    if (this.phase === 'idle') return false;

    this.timer += dt;
    const progress = Math.min(this.timer / this.currentDuration, 1.0);

    switch (this.phase) {
      case 'fading_out':
        this.setOverlayOpacity(progress);
        if (progress >= 1.0) {
          // Screen is fully black — call midpoint
          this.onMidpoint?.();
          this.phase = 'loading';
          this.timer = 0;
          this.currentDuration = this.config.minLoadingTime;
        }
        break;

      case 'loading':
        // Wait minimum loading time
        if (progress >= 1.0) {
          this.phase = 'fading_in';
          this.timer = 0;
          this.currentDuration = this.config.fadeInDuration;
        }
        break;

      case 'fading_in':
        this.setOverlayOpacity(1.0 - progress);
        if (progress >= 1.0) {
          this.setOverlayOpacity(0);
          this.phase = 'idle';
          this.onComplete?.();
          this.onMidpoint = null;
          this.onComplete = null;
        }
        break;
    }

    return true;
  }

  // ── Overlay ─────────────────────────────────────────────────────

  private setOverlayOpacity(opacity: number): void {
    if (!this.overlay) return;
    this.overlay.style.opacity = String(Math.max(0, Math.min(1, opacity)));
    this.overlay.style.pointerEvents = opacity > 0 ? 'all' : 'none';
  }

  // ── Getters ─────────────────────────────────────────────────────

  getState(): TransitionState {
    return {
      phase: this.phase,
      from: this.from,
      to: this.to,
      progress: this.currentDuration > 0 ? Math.min(this.timer / this.currentDuration, 1.0) : 0,
    };
  }

  isActive(): boolean {
    return this.phase !== 'idle';
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  dispose(): void {
    this.setOverlayOpacity(0);
    this.phase = 'idle';
    this.onMidpoint = null;
    this.onComplete = null;
    this.overlay = null;
  }
}

// ── Singleton ───────────────────────────────────────────────────────

export const sceneTransition = new SceneTransition();
