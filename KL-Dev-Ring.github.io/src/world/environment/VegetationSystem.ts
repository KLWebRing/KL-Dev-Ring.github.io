// ── KL DevVerse — Vegetation System ─────────────────────────────────
// GPU-instanced vegetation for performance.
// Uses InstancedMesh to render many grass patches, bushes, and
// decorative plants with minimal draw calls.
//
// Future: wind animation via vertex shader, LOD transitions.

import {
  InstancedMesh,
  PlaneGeometry,
  MeshToonMaterial,
  Object3D,
  Scene,
  DoubleSide,
  Color,
} from 'three';
import { COLORS } from '@/shared/constants';

// ── Grass Patch System ──────────────────────────────────────────────

const GRASS_CONFIG = {
  /** Max grass patches in the world */
  MAX_INSTANCES: 3000,
  /** Size of each grass blade */
  BLADE_WIDTH: 0.3,
  BLADE_HEIGHT: 0.4,
  /** Area to spawn grass (around world center) */
  AREA: 120,
  /** Minimum distance between patches */
  MIN_SPACING: 1.5,
} as const;

export class VegetationSystem {
  private grassMesh: InstancedMesh | null = null;
  private readonly dummy = new Object3D();
  private instanceCount = 0;

  // ── Init ────────────────────────────────────────────────────────

  init(scene: Scene): void {
    this.createGrassPatches(scene);
    console.log(`[VegetationSystem] Initialized — ${this.instanceCount} grass patches`);
  }

  private createGrassPatches(scene: Scene): void {
    const geometry = new PlaneGeometry(
      GRASS_CONFIG.BLADE_WIDTH,
      GRASS_CONFIG.BLADE_HEIGHT,
    );
    // Shift pivot to bottom so grass sits on ground
    geometry.translate(0, GRASS_CONFIG.BLADE_HEIGHT / 2, 0);

    const material = new MeshToonMaterial({
      color: new Color(COLORS.LEAF_GREEN),
      side: DoubleSide,
      transparent: true,
      opacity: 0.85,
    });

    this.grassMesh = new InstancedMesh(geometry, material, GRASS_CONFIG.MAX_INSTANCES);
    this.grassMesh.frustumCulled = false;
    this.grassMesh.name = 'vegetationGrass';

    // Place grass patches — avoid roads and structures
    let placed = 0;
    const roadHalfWidth = 3.5; // avoid the central roads

    for (let attempt = 0; attempt < GRASS_CONFIG.MAX_INSTANCES * 3 && placed < GRASS_CONFIG.MAX_INSTANCES; attempt++) {
      const x = (Math.random() - 0.5) * GRASS_CONFIG.AREA * 2;
      const z = (Math.random() - 0.5) * GRASS_CONFIG.AREA * 2;

      // Skip if on roads (cross pattern)
      if (Math.abs(x) < roadHalfWidth || Math.abs(z) < roadHalfWidth) continue;

      // Skip if in central plaza
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 14) continue;

      // Skip if in river area
      if (x > 38 && x < 52) continue;

      // Random rotation and slight scale variation
      this.dummy.position.set(x, 0.02, z);
      this.dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      const scale = 0.7 + Math.random() * 0.6;
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();

      this.grassMesh.setMatrixAt(placed, this.dummy.matrix);

      // Slight color variation per instance
      const hueShift = 0.95 + Math.random() * 0.1;
      this.grassMesh.setColorAt(placed, new Color(COLORS.LEAF_GREEN).multiplyScalar(hueShift));

      placed++;
    }

    this.instanceCount = placed;
    this.grassMesh.count = placed;

    if (this.grassMesh.instanceColor) {
      this.grassMesh.instanceColor.needsUpdate = true;
    }

    scene.add(this.grassMesh);
  }

  // ── Cleanup ─────────────────────────────────────────────────────

  dispose(scene: Scene): void {
    if (this.grassMesh) {
      scene.remove(this.grassMesh);
      this.grassMesh.geometry.dispose();
      (this.grassMesh.material as MeshToonMaterial).dispose();
      this.grassMesh = null;
    }
  }

  getInstanceCount(): number {
    return this.instanceCount;
  }
}
