// ── KL DevVerse — Input Manager ──────────────────────────────────────
// Unified keyboard, mouse, and touch input handler.
// Lives outside React to avoid re-render overhead.
// Subscribe with callbacks or poll the snapshot for use in the game loop.

interface InputSnapshot {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  interact: boolean;
  mouseX: number;
  mouseY: number;
  mouseDelta: { x: number; y: number };
  mouseDown: boolean;
}

type InteractCallback = () => void;

class InputManager {
  private keys: Set<string> = new Set();
  private _mouseDown = false;
  private _mouseX = 0;
  private _mouseY = 0;
  private _mouseDelta = { x: 0, y: 0 };
  private _accumulated = { x: 0, y: 0 };

  // Touch
  private _touchStart = { x: 0, y: 0 };
  private _touchDelta = { x: 0, y: 0 };

  private onInteract: InteractCallback | null = null;
  private onJump: (() => void) | null = null;

  private bound = false;

  bind(): void {
    if (this.bound) return;
    this.bound = true;

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('touchstart', this.onTouchStart, { passive: true });
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });
    window.addEventListener('touchend', this.onTouchEnd, { passive: true });
    window.addEventListener('contextmenu', this.preventDefault);
  }

  unbind(): void {
    if (!this.bound) return;
    this.bound = false;

    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('contextmenu', this.preventDefault);
    this.keys.clear();
  }

  setInteractCallback(cb: InteractCallback): void {
    this.onInteract = cb;
  }

  setJumpCallback(cb: () => void): void {
    this.onJump = cb;
  }

  /** Call once per frame — returns delta and resets accumulation */
  flushDelta(): { x: number; y: number } {
    const delta = { ...this._accumulated };
    this._accumulated = { x: 0, y: 0 };
    return delta;
  }

  /** Poll current state — cheap, for use in the render loop */
  snapshot(): InputSnapshot {
    const forward = this.keys.has('w') || this.keys.has('arrowup');
    const backward = this.keys.has('s') || this.keys.has('arrowdown');
    const left = this.keys.has('a') || this.keys.has('arrowleft');
    const right = this.keys.has('d') || this.keys.has('arrowright');
    const sprint = this.keys.has('shift');
    const jump = this.keys.has(' ');
    const interact = this.keys.has('e');

    return {
      forward,
      backward,
      left,
      right,
      sprint,
      jump,
      interact,
      mouseX: this._mouseX,
      mouseY: this._mouseY,
      mouseDelta: this.flushDelta(),
      mouseDown: this._mouseDown,
    };
  }

  // ── Key Handlers ────────────────────────────────────────────────────

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys.add(key);

    if (key === 'e') {
      this.onInteract?.();
    }
    if (key === ' ') {
      e.preventDefault();
      this.onJump?.();
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  // ── Mouse Handlers ─────────────────────────────────────────────────

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (this._mouseDown) {
      this._accumulated.x += e.movementX;
      this._accumulated.y += e.movementY;
    }
    this._mouseX = e.clientX;
    this._mouseY = e.clientY;
    this._mouseDelta = { x: e.movementX, y: e.movementY };
  };

  private readonly onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0 || e.button === 2) {
      this._mouseDown = true;
    }
  };

  private readonly onMouseUp = (): void => {
    this._mouseDown = false;
  };

  // ── Touch Handlers ─────────────────────────────────────────────────

  private readonly onTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    if (touch) {
      this._touchStart = { x: touch.clientX, y: touch.clientY };
      this._touchDelta = { x: 0, y: 0 };
    }
  };

  private readonly onTouchMove = (e: TouchEvent): void => {
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - this._touchStart.x;
    const dy = touch.clientY - this._touchStart.y;
    this._accumulated.x += dx - this._touchDelta.x;
    this._accumulated.y += dy - this._touchDelta.y;
    this._touchDelta = { x: dx, y: dy };
  };

  private readonly onTouchEnd = (): void => {
    this._touchDelta = { x: 0, y: 0 };
  };

  private readonly preventDefault = (e: Event): void => {
    e.preventDefault();
  };
}

// Singleton — one input manager for the whole app
export const inputManager = new InputManager();
