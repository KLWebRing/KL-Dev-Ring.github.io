// ── KL DevVerse — Weather Particles ─────────────────────────────────
// GPU-instanced particle systems for weather effects.
// Rain: instanced vertical billboards falling from sky.
// Fog: adjusts scene fog density dynamically.
// Future: snow, dust, pollen, fireflies.
//
// Performance: uses InstancedMesh with shared geometry.
// Particle count scales with weather intensity.

import {
  InstancedMesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Object3D,
  Scene,
  MathUtils,
} from 'three';

// ── Rain Particle System ────────────────────────────────────────────

const RAIN_CONFIG = {
  /** Maximum number of rain drops */
  MAX_PARTICLES: 2000,
  /** Rain drop width */
  DROP_WIDTH: 0.03,
  /** Rain drop height */
  DROP_HEIGHT: 0.6,
  /** Rain area around the player (half-extent) */
  AREA: 30,
  /** Height range */
  MIN_Y: -2,
  MAX_Y: 25,
  /** Fall speed (units per second) */
  FALL_SPEED: 18,
  /** Wind sway factor */
  WIND_SWAY: 2.0,
} as const;

export class RainParticleSystem {
  private mesh: InstancedMesh | null = null;
  private readonly dummy = new Object3D();
  private activeCount = 0;
  private intensity = 0; // 0..1
  private windStrength = 0;

  // Per-particle state (positions stored in flat arrays for speed)
  private posX: Float32Array;
  private posY: Float32Array;
  private posZ: Float32Array;
  private speed: Float32Array;

  // Player tracking
  private playerX = 0;
  private playerZ = 0;

  constructor() {
    this.posX = new Float32Array(RAIN_CONFIG.MAX_PARTICLES);
    this.posY = new Float32Array(RAIN_CONFIG.MAX_PARTICLES);
    this.posZ = new Float32Array(RAIN_CONFIG.MAX_PARTICLES);
    this.speed = new Float32Array(RAIN_CONFIG.MAX_PARTICLES);
  }

  // ── Init ────────────────────────────────────────────────────────

  init(scene: Scene): void {
    const geometry = new PlaneGeometry(RAIN_CONFIG.DROP_WIDTH, RAIN_CONFIG.DROP_HEIGHT);
    const material = new MeshBasicMaterial({
      color: 0xaabbdd,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });

    this.mesh = new InstancedMesh(geometry, material, RAIN_CONFIG.MAX_PARTICLES);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.name = 'rainParticles';
    scene.add(this.mesh);

    // Initialize all particles at random positions
    for (let i = 0; i < RAIN_CONFIG.MAX_PARTICLES; i++) {
      this.resetParticle(i);
    }
  }

  // ── Update ──────────────────────────────────────────────────────

  update(dt: number): void {
    if (!this.mesh) return;

    // Calculate how many particles to show based on intensity
    const targetCount = Math.floor(this.intensity * RAIN_CONFIG.MAX_PARTICLES);
    this.activeCount = targetCount;
    this.mesh.visible = this.activeCount > 0;

    if (this.activeCount === 0) return;

    // Update particle positions
    for (let i = 0; i < this.activeCount; i++) {
      // Fall
      this.posY[i]! -= (this.speed[i]! * dt);

      // Wind sway
      this.posX[i]! += this.windStrength * RAIN_CONFIG.WIND_SWAY * dt;

      // Reset if below ground
      if (this.posY[i]! < RAIN_CONFIG.MIN_Y) {
        this.resetParticle(i);
      }

      // Update instance matrix
      this.dummy.position.set(
        this.posX[i]! + this.playerX,
        this.posY[i]!,
        this.posZ[i]! + this.playerZ,
      );
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    // Hide unused particles
    this.dummy.position.set(0, -100, 0);
    this.dummy.updateMatrix();
    for (let i = this.activeCount; i < RAIN_CONFIG.MAX_PARTICLES; i++) {
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // ── Controls ────────────────────────────────────────────────────

  setIntensity(intensity: number): void {
    this.intensity = MathUtils.clamp(intensity, 0, 1);
  }

  setWind(strength: number): void {
    this.windStrength = strength;
  }

  setPlayerPosition(x: number, z: number): void {
    this.playerX = x;
    this.playerZ = z;
  }

  // ── Internal ────────────────────────────────────────────────────

  private resetParticle(i: number): void {
    this.posX[i] = (Math.random() - 0.5) * RAIN_CONFIG.AREA * 2;
    this.posY[i] = RAIN_CONFIG.MIN_Y + Math.random() * (RAIN_CONFIG.MAX_Y - RAIN_CONFIG.MIN_Y);
    this.posZ[i] = (Math.random() - 0.5) * RAIN_CONFIG.AREA * 2;
    this.speed[i] = RAIN_CONFIG.FALL_SPEED * (0.8 + Math.random() * 0.4);
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  dispose(scene: Scene): void {
    if (this.mesh) {
      scene.remove(this.mesh);
      this.mesh.geometry.dispose();
      (this.mesh.material as MeshBasicMaterial).dispose();
      this.mesh = null;
    }
  }
}
