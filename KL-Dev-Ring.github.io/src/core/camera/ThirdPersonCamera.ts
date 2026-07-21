// ── KL DevVerse — Third Person Camera Controller ─────────────────────
// Production camera system with smooth follow, orbit, dynamic FOV,
// and collision avoidance via raycast.

import { Vector3, Spherical, PerspectiveCamera, Raycaster, Object3D } from 'three';
import { CAMERA, PLAYER } from '@/shared/constants';
import { clamp, lerp } from '@/shared/math';

export class ThirdPersonCamera {
  readonly camera: PerspectiveCamera;

  yaw: number = 0;       // Horizontal orbit angle
  pitch: number = -0.2;  // Vertical orbit angle

  private readonly raycaster = new Raycaster();
  private readonly _target = new Vector3();
  private readonly _position = new Vector3();
  private readonly _desired = new Vector3();
  private _zoom: number = CAMERA.OFFSET.z;
  private _fov: number = CAMERA.FOV_DEFAULT;

  constructor() {
    this.camera = new PerspectiveCamera(CAMERA.FOV_DEFAULT, 1, 0.1, 800);
    this.camera.position.set(0, CAMERA.OFFSET.y, CAMERA.OFFSET.z);
  }

  /**
   * Apply mouse drag delta to orbit angles.
   */
  applyDelta(dx: number, dy: number): void {
    this.yaw   -= dx * CAMERA.ORBIT_SPEED;
    this.pitch -= dy * CAMERA.ORBIT_SPEED;
    this.pitch  = clamp(this.pitch, CAMERA.PITCH_MIN, CAMERA.PITCH_MAX);
  }

  /**
   * Apply scroll wheel to zoom distance.
   */
  applyZoom(delta: number): void {
    this._zoom = clamp(this._zoom + delta * 0.5, CAMERA.ZOOM_MIN, CAMERA.ZOOM_MAX);
  }

  /**
   * Update camera position to follow the player.
   * Call once per frame inside useFrame().
   */
  update(
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    isSprinting: boolean,
    collidables: Object3D[] = [],
  ): void {
    const safeDt = Math.min(dt, 0.1);

    // ── Target: slightly above player's head ────────────────────────
    this._target.set(playerX, playerY + 1.2, playerZ);

    // ── Desired camera position from spherical coordinates ──────────
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);
    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);

    this._desired.set(
      this._target.x + this._zoom * sinY * cosP,
      this._target.y + this._zoom * sinP,
      this._target.z + this._zoom * cosY * cosP,
    );

    // ── Collision avoidance (raycast from target to desired) ─────────
    if (collidables.length > 0) {
      const dir = this._desired.clone().sub(this._target).normalize();
      this.raycaster.set(this._target, dir);
      this.raycaster.far = this._zoom;
      const hits = this.raycaster.intersectObjects(collidables, true);
      if (hits.length > 0 && hits[0]) {
        const safeDistance = hits[0].distance - CAMERA.COLLISION_OFFSET;
        if (safeDistance < this._zoom) {
          this._desired.copy(this._target).addScaledVector(dir, safeDistance);
        }
      }
    }

    // ── Smooth follow ────────────────────────────────────────────────
    const followFactor = clamp(CAMERA.FOLLOW_SPEED * safeDt, 0, 1);
    this.camera.position.lerp(this._desired, followFactor);
    this.camera.lookAt(this._target);

    // ── Dynamic FOV on sprint ────────────────────────────────────────
    const targetFOV = isSprinting ? CAMERA.FOV_SPRINT : CAMERA.FOV_DEFAULT;
    this._fov = lerp(this._fov, targetFOV, 8 * safeDt);
    if (Math.abs(this._fov - this.camera.fov) > 0.05) {
      this.camera.fov = this._fov;
      this.camera.updateProjectionMatrix();
    }
  }

  updateAspect(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
