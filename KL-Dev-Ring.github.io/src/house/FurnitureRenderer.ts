// ── KL DevVerse — Furniture Renderer ─────────────────────────────────
// Creates low-poly 3D furniture meshes from catalog definitions.
// Each furniture type has a unique procedural generator.

import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
  MeshToonMaterial,
  MeshBasicMaterial,
  BackSide,
  Color,
} from 'three';
import type { FurnitureCatalogEntry } from '@/shared/types';
import { getFurnitureById } from '@/inventory/catalogs/furnitureCatalog';

// ── Helper ──────────────────────────────────────────────────────────

function toon(geo: ConstructorParameters<typeof Mesh>[0], color: number | string, outline = 0.03): Mesh {
  const mat = new MeshToonMaterial({ color });
  const mesh = new Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (outline > 0) {
    const ol = new Mesh(geo, new MeshBasicMaterial({ color: 0x2c2d30, side: BackSide }));
    ol.scale.setScalar(1 + outline);
    mesh.add(ol);
  }
  return mesh;
}

// ── Furniture Generators ────────────────────────────────────────────

function createDesk(variant: string): Group {
  const g = new Group();
  g.name = 'furniture_desk';
  const topColor = variant === 'dark_wood' ? 0x3b2415 : variant === 'light_wood' ? 0xc4a882 : 0x8b6914;

  // Table top
  const top = toon(new BoxGeometry(1.4, 0.06, 0.7), topColor);
  top.position.set(0, 0.7, 0);
  g.add(top);

  // Legs
  const legMat = 0x2c2d30;
  for (const [lx, lz] of [[-0.6, -0.28], [0.6, -0.28], [-0.6, 0.28], [0.6, 0.28]] as const) {
    const leg = toon(new CylinderGeometry(0.025, 0.025, 0.7, 6), legMat, 0);
    leg.position.set(lx, 0.35, lz);
    g.add(leg);
  }

  return g;
}

function createChair(variant: string): Group {
  const g = new Group();
  g.name = 'furniture_chair';
  const seatColor = variant === 'blue' ? 0x2563eb : variant === 'red' ? 0xdc2626 : 0x4a5568;

  // Seat
  const seat = toon(new BoxGeometry(0.45, 0.05, 0.45), seatColor);
  seat.position.set(0, 0.4, 0);
  g.add(seat);

  // Backrest
  const back = toon(new BoxGeometry(0.45, 0.5, 0.05), seatColor);
  back.position.set(0, 0.65, -0.2);
  g.add(back);

  // Legs
  for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]] as const) {
    const leg = toon(new CylinderGeometry(0.02, 0.02, 0.4, 6), 0x2c2d30, 0);
    leg.position.set(lx, 0.2, lz);
    g.add(leg);
  }

  return g;
}

function createMonitor(variant: string): Group {
  const g = new Group();
  g.name = 'furniture_monitor';

  // Screen
  const screen = toon(new BoxGeometry(0.8, 0.5, 0.03), 0x1a1a2e);
  screen.position.set(0, 0.3, 0);
  g.add(screen);

  // Screen content (glowing)
  const content = new Mesh(
    new PlaneGeometry(0.72, 0.42),
    new MeshToonMaterial({ color: 0x0f172a, emissive: 0x1e3a5f, emissiveIntensity: 0.4 }),
  );
  content.position.set(0, 0.3, 0.02);
  g.add(content);

  // Stand
  const stand = toon(new CylinderGeometry(0.03, 0.04, 0.2, 8), 0x4a5568, 0);
  stand.position.set(0, 0.0, 0);
  g.add(stand);

  // Base
  const base = toon(new BoxGeometry(0.3, 0.02, 0.15), 0x4a5568);
  base.position.set(0, -0.1, 0);
  g.add(base);

  return g;
}

function createBookshelf(variant: string): Group {
  const g = new Group();
  g.name = 'furniture_bookshelf';
  const woodColor = 0x8b6914;

  // Frame
  const frame = toon(new BoxGeometry(0.8, 1.6, 0.3), woodColor);
  frame.position.set(0, 0.8, 0);
  g.add(frame);

  // Books (colored blocks)
  const bookColors = [0xc0392b, 0x2563eb, 0x16a34a, 0xd97706, 0x9333ea];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const book = toon(
        new BoxGeometry(0.12, 0.28, 0.18),
        bookColors[(row * 4 + col) % bookColors.length]!,
        0,
      );
      book.position.set(-0.24 + col * 0.16, 0.3 + row * 0.5, 0);
      g.add(book);
    }
  }

  return g;
}

function createPlant(variant: string): Group {
  const g = new Group();
  g.name = 'furniture_plant';

  // Pot
  const pot = toon(new CylinderGeometry(0.12, 0.1, 0.2, 8), 0xb45309);
  pot.position.set(0, 0.1, 0);
  g.add(pot);

  // Soil
  const soil = toon(new CylinderGeometry(0.11, 0.11, 0.03, 8), 0x3d2e1f, 0);
  soil.position.set(0, 0.21, 0);
  g.add(soil);

  // Leaves
  const leafColor = variant === 'succulent' ? 0x22c55e : variant === 'fern' ? 0x15803d : 0x16a34a;
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const leaf = toon(new SphereGeometry(0.08, 6, 4), leafColor, 0);
    leaf.position.set(Math.cos(angle) * 0.08, 0.32, Math.sin(angle) * 0.08);
    leaf.scale.set(1, 0.7, 1);
    g.add(leaf);
  }

  // Center
  const center = toon(new SphereGeometry(0.06, 6, 4), leafColor, 0);
  center.position.set(0, 0.38, 0);
  g.add(center);

  return g;
}

function createLamp(variant: string): Group {
  const g = new Group();
  g.name = 'furniture_lamp';

  const isNeon = variant === 'hello_world' || variant === 'code' || variant === 'custom';

  if (isNeon) {
    // Neon sign
    const frame = toon(new BoxGeometry(0.6, 0.3, 0.05), 0x1a1a1a);
    frame.position.set(0, 0.3, 0);
    g.add(frame);

    const glow = new Mesh(
      new PlaneGeometry(0.5, 0.2),
      new MeshToonMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.6 }),
    );
    glow.position.set(0, 0.3, 0.03);
    g.add(glow);
  } else {
    // Desk lamp
    const base = toon(new CylinderGeometry(0.08, 0.1, 0.04, 8), 0x4a5568);
    base.position.set(0, 0.02, 0);
    g.add(base);

    const arm = toon(new CylinderGeometry(0.015, 0.015, 0.4, 6), 0x4a5568, 0);
    arm.position.set(0, 0.22, 0);
    arm.rotation.z = 0.3;
    g.add(arm);

    const shade = toon(new CylinderGeometry(0.06, 0.1, 0.1, 8), 0xfbbf24);
    shade.position.set(0.06, 0.42, 0);
    g.add(shade);
  }

  return g;
}

function createSofa(variant: string): Group {
  const g = new Group();
  g.name = 'furniture_sofa';
  const fabricColor = variant === 'gray' ? 0x6b7280 : variant === 'green' ? 0x166534 : 0x4a5568;

  // Seat
  const seat = toon(new BoxGeometry(1.2, 0.25, 0.6), fabricColor);
  seat.position.set(0, 0.25, 0);
  g.add(seat);

  // Back
  const back = toon(new BoxGeometry(1.2, 0.45, 0.15), fabricColor);
  back.position.set(0, 0.6, -0.22);
  g.add(back);

  // Armrests
  for (const side of [-1, 1]) {
    const arm = toon(new BoxGeometry(0.12, 0.35, 0.6), fabricColor);
    arm.position.set(side * 0.6, 0.3, 0);
    g.add(arm);
  }

  // Cushions
  for (const cx of [-0.3, 0.3]) {
    const cushion = toon(new BoxGeometry(0.5, 0.08, 0.45), new Color(fabricColor).offsetHSL(0, 0, 0.05).getHex());
    cushion.position.set(cx, 0.41, 0.02);
    g.add(cushion);
  }

  return g;
}

function createWhiteboard(_variant: string): Group {
  const g = new Group();
  g.name = 'furniture_whiteboard';

  // Board
  const board = toon(new BoxGeometry(1.2, 0.8, 0.04), 0xf5f5f5);
  board.position.set(0, 1.2, 0);
  g.add(board);

  // Frame
  const frameMat = 0x9ca3af;
  const top = toon(new BoxGeometry(1.24, 0.03, 0.06), frameMat, 0);
  top.position.set(0, 1.61, 0);
  g.add(top);

  const bottom = toon(new BoxGeometry(1.24, 0.03, 0.06), frameMat, 0);
  bottom.position.set(0, 0.79, 0);
  g.add(bottom);

  // Tray
  const tray = toon(new BoxGeometry(0.6, 0.03, 0.08), frameMat, 0);
  tray.position.set(0, 0.78, 0.04);
  g.add(tray);

  return g;
}

function createLaptop(_variant: string): Group {
  const g = new Group();
  g.name = 'furniture_laptop';

  // Base
  const base = toon(new BoxGeometry(0.35, 0.02, 0.25), 0x374151);
  base.position.set(0, 0.01, 0);
  g.add(base);

  // Screen
  const screen = toon(new BoxGeometry(0.33, 0.22, 0.01), 0x1f2937);
  screen.position.set(0, 0.12, -0.12);
  screen.rotation.x = -0.2;
  g.add(screen);

  // Screen glow
  const glow = new Mesh(
    new PlaneGeometry(0.29, 0.18),
    new MeshToonMaterial({ color: 0x0f172a, emissive: 0x1e3a5f, emissiveIntensity: 0.3 }),
  );
  glow.position.set(0, 0.12, -0.115);
  glow.rotation.x = -0.2;
  g.add(glow);

  return g;
}

// ── Factory ─────────────────────────────────────────────────────────

const GENERATORS: Record<string, (variant: string) => Group> = {
  desk: createDesk,
  chair: createChair,
  monitor: createMonitor,
  bookshelf: createBookshelf,
  plant: createPlant,
  lamp: createLamp,
  sofa: createSofa,
  whiteboard: createWhiteboard,
  laptop: createLaptop,
};

/**
 * Create a 3D mesh for a furniture catalog item.
 * Returns null if the item ID is not found or has no generator.
 */
export function createFurnitureMesh(catalogId: string, variant = 'default'): Group | null {
  const entry = getFurnitureById(catalogId);
  if (!entry) return null;

  const generator = GENERATORS[entry.category];
  if (!generator) return null;

  const mesh = generator(variant);
  mesh.scale.setScalar(entry.scale);
  mesh.userData = { catalogId, category: entry.category, variant };
  return mesh;
}
