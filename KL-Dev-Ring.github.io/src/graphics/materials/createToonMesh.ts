// ── KL DevVerse — createToonMesh ─────────────────────────────────────
// Ported from character.js — the core mesh factory for ALL world objects.
// Creates a primary mesh + a backface outline hull (cel-shading trick).

import {
  Mesh,
  MeshBasicMaterial,
  BackSide,
  type BufferGeometry,
  type Material,
} from 'three';
import { RENDER } from '@/shared/constants';

export function createToonMesh(
  geometry: BufferGeometry,
  material: Material,
  outlineThickness: number = RENDER.OUTLINE_THICKNESS,
  outlineColor: number = 0x2c2d30,
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (outlineThickness > 0) {
    const outlineMat = new MeshBasicMaterial({
      color: outlineColor,
      side: BackSide,
    });
    const outline = new Mesh(geometry, outlineMat);
    outline.scale.setScalar(1 + outlineThickness);
    outline.castShadow = false;
    outline.receiveShadow = false;
    mesh.add(outline);
  }

  return mesh;
}
