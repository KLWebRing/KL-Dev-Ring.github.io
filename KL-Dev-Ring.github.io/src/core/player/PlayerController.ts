// ── KL DevVerse — Player Controller ─────────────────────────────────
// Extracted from world.js and rebuilt as a proper class.
// Handles camera-relative WASD movement, sprint, jump, and cylinder
// collision against the Structure registry.
// Physics are simple kinematic — architected for Rapier integration
// in Phase 2 without requiring code rewrite.

import { Group, Vector3, Euler } from 'three';
import { PLAYER, CAMERA } from '@/shared/constants';
import { clamp, distanceXZ, normalizeAngle } from '@/shared/math';
import type { Structure } from '@/shared/types';
import type { InputManager } from '../input/InputManager';

// Re-export the singleton type
type InputManagerInstance = InstanceType<typeof import('../input/InputManager').inputManager.__proto__.constructor>;

export interface PlayerControllerOptions {
  group: Group;
  getStructures: () => Structure[];
  cameraYaw: () => number;
}

export class PlayerController {
  readonly group: Group;

  // Position (authoritative)
  x: number;
  y: number;
  z: number;

  // Orientation
  yaw: number = 0;
  pitch: number = -0.2;

  // Velocity
  private velY: number = 0;
  private velX: number = 0;
  private velZ: number = 0;

  // State
  private isGrounded: boolean = true;
  private isSprinting: boolean = false;
  private coyoteTimer: number = 0;

  // Animation
  animState: 'idle' | 'walk' | 'run' | 'jump' = 'idle';

  private readonly getStructures: () => Structure[];
  private readonly getCameraYaw: () => number;

  constructor(options: PlayerControllerOptions) {
    this.group = options.group;
    this.getStructures = options.getStructures;
    this.getCameraYaw = options.cameraYaw;

    this.x = 0;
    this.y = PLAYER.GROUND_Y;
    this.z = 12;

    this.group.position.set(this.x, this.y, this.z);
  }

  /**
   * Update player state.
   * @param dt - delta time in seconds (capped at 0.1s)
   * @param input - current input snapshot
   */
  update(
    dt: number,
    input: {
      forward: boolean;
      backward: boolean;
      left: boolean;
      right: boolean;
      sprint: boolean;
      jump: boolean;
    }
  ): void {
    const safeDt = Math.min(dt, 0.1);
    const camYaw = this.getCameraYaw();

    // ── Movement direction (camera-relative) ────────────────────────
    let moveX = 0;
    let moveZ = 0;

    if (input.forward)  { moveX -= Math.sin(camYaw); moveZ -= Math.cos(camYaw); }
    if (input.backward) { moveX += Math.sin(camYaw); moveZ += Math.cos(camYaw); }
    if (input.left)     { moveX -= Math.cos(camYaw); moveZ += Math.sin(camYaw); }
    if (input.right)    { moveX += Math.cos(camYaw); moveZ -= Math.sin(camYaw); }

    const hasInput = moveX !== 0 || moveZ !== 0;

    // Normalize diagonal movement
    if (hasInput) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= len;
      moveZ /= len;
    }

    this.isSprinting = input.sprint && hasInput;
    const targetSpeed = this.isSprinting ? PLAYER.RUN_SPEED : PLAYER.WALK_SPEED;
    const accel = hasInput ? PLAYER.ACCELERATION : PLAYER.DECELERATION;

    // ── Smooth acceleration / deceleration ──────────────────────────
    const targetVelX = hasInput ? moveX * targetSpeed : 0;
    const targetVelZ = hasInput ? moveZ * targetSpeed : 0;
    this.velX += (targetVelX - this.velX) * clamp(accel * safeDt, 0, 1);
    this.velZ += (targetVelZ - this.velZ) * clamp(accel * safeDt, 0, 1);

    // ── Jump & gravity ───────────────────────────────────────────────
    if (this.isGrounded) {
      this.coyoteTimer = PLAYER.COYOTE_TIME;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - safeDt);
    }

    if (input.jump && this.coyoteTimer > 0 && this.velY <= 0) {
      this.velY = PLAYER.JUMP_FORCE;
      this.coyoteTimer = 0;
    }

    this.velY += PLAYER.GRAVITY * safeDt;

    // ── Integrate position ───────────────────────────────────────────
    let nx = this.x + this.velX * safeDt;
    let ny = this.y + this.velY * safeDt;
    let nz = this.z + this.velZ * safeDt;

    // ── Ground clamping ──────────────────────────────────────────────
    if (ny <= PLAYER.GROUND_Y) {
      ny = PLAYER.GROUND_Y;
      this.velY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // ── Cylinder collision with structures ───────────────────────────
    const structures = this.getStructures();
    for (const s of structures) {
      const dist = distanceXZ(nx, nz, s.x, s.z);
      const minDist = PLAYER.COLLISION_RADIUS + s.radius;
      if (dist < minDist && dist > 0.001) {
        const push = (minDist - dist) / dist;
        nx += (nx - s.x) * push;
        nz += (nz - s.z) * push;
      }
    }

    this.x = nx;
    this.y = ny;
    this.z = nz;

    this.group.position.set(this.x, this.y, this.z);

    // ── Character facing ─────────────────────────────────────────────
    if (hasInput) {
      const targetYaw = Math.atan2(this.velX, this.velZ);
      let diff = normalizeAngle(targetYaw - this.group.rotation.y);
      this.group.rotation.y += diff * clamp(12 * safeDt, 0, 1);
    }

    // ── Animation state ──────────────────────────────────────────────
    if (!this.isGrounded) {
      this.animState = 'jump';
    } else if (this.isSprinting) {
      this.animState = 'run';
    } else if (hasInput) {
      this.animState = 'walk';
    } else {
      this.animState = 'idle';
    }
  }

  teleport(x: number, y: number, z: number, yaw: number = 0): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.yaw = yaw;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;
    this.group.position.set(x, y, z);
    this.group.rotation.y = yaw;
  }
}
