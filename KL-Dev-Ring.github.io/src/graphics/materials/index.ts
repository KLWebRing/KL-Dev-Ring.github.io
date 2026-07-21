// ── KL DevVerse — Toon Material Factory ─────────────────────────────
// Centralized material creation. All Three.js materials flow through here.
// Ensures consistent cel-shaded look across the entire world.

import {
  MeshToonMaterial,
  MeshBasicMaterial,
  CanvasTexture,
  RepeatWrapping,
  type ColorRepresentation,
  type Texture,
} from 'three';

/** Create a cel-shaded toon material */
export function toon(color: ColorRepresentation, options: {
  emissive?: ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  map?: Texture;
} = {}): MeshToonMaterial {
  const params: ConstructorParameters<typeof MeshToonMaterial>[0] = { color };
  if (options.emissive !== undefined) params.emissive = options.emissive as number;
  if (options.emissiveIntensity !== undefined) params.emissiveIntensity = options.emissiveIntensity;
  if (options.transparent !== undefined) params.transparent = options.transparent;
  if (options.opacity !== undefined) params.opacity = options.opacity;
  if (options.map !== undefined) params.map = options.map;
  return new MeshToonMaterial(params);
}

/** Create an unlit material (for outlines, UI geometry, flames) */
export function unlit(color: ColorRepresentation): MeshBasicMaterial {
  return new MeshBasicMaterial({ color });
}

// ── Procedural Texture Generators ───────────────────────────────────
// All canvas textures are generated at startup and shared across materials.
// They match the ones previously scattered throughout world.js.

/** Animated river / backwater texture */
export function createRiverTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0284c7';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const y = i * 24;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(32, y + 8, 96, y - 8, 128, y);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 30);
  return texture;
}

/** Kerala clay tile roof texture */
export function createRoofTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#a83a22';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1.5;

  for (let r = 0; r < 8; r++) {
    const y = r * 8;
    for (let c = 0; c < 8; c++) {
      const x = c * 8;
      ctx.beginPath();
      ctx.arc(x + 4, y, 4, 0, Math.PI);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, y + 8);
    ctx.lineTo(64, y + 8);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}

/** Cobblestone marketplace ground */
export function createCobblestoneTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8a8d90';
  ctx.fillRect(0, 0, 128, 128);

  const stoneColors = ['#7a7d80', '#8e9194', '#9fa2a5', '#aaadbe', '#9a9082', '#84827d'];
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#404245';

  const rows = 8;
  const cols = 8;
  const w = 128 / cols;
  const h = 128 / rows;

  for (let r = 0; r < rows; r++) {
    const y = r * h;
    const offset = (r % 2) * (w / 2);
    for (let c = -1; c <= cols; c++) {
      const x = c * w + offset;
      ctx.fillStyle = stoneColors[Math.floor(Math.random() * stoneColors.length)] ?? '#8a8d90';
      ctx.beginPath();
      const sx = x + 2;
      const sy = y + 2;
      const sw = w - 4;
      const sh = h - 4;
      if (ctx.roundRect) {
        ctx.roundRect(sx, sy, sw, sh, 4);
      } else {
        ctx.rect(sx, sy, sw, sh);
      }
      ctx.fill();
      ctx.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

/** Striped shop awning fabric */
export function createStripedTexture(color1: string, color2: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = color1;
  ctx.fillRect(0, 0, 32, 32);
  ctx.fillStyle = color2;
  ctx.fillRect(0, 0, 16, 32);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(8, 2);
  return texture;
}

/** Coir mat / handloom weave texture */
export function createCoirTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#cca070';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#805830';
  ctx.lineWidth = 1;

  for (let i = 0; i < 64; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 64);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(64, i);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(4, 4);
  return texture;
}
