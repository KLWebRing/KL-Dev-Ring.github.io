// ── KL DevVerse — Environment Factory ───────────────────────────────
// Modular procedural generators for world objects.
// Each function returns a Three.js Group with metadata.
// All objects use the centralized toon() material factory.

import {
  Group, Mesh, BoxGeometry, CylinderGeometry,
  SphereGeometry, ConeGeometry,
} from 'three';
import { createToonMesh } from '@/graphics/materials/createToonMesh';
import { toon } from '@/graphics/materials';
import { COLORS } from '@/shared/constants';

// ── Object Metadata ─────────────────────────────────────────────────

export interface EnvironmentObjectMeta {
  /** Collision radius for player avoidance */
  readonly collisionRadius: number;
  /** Can the player interact with this object? */
  readonly interactable: boolean;
  /** Category for filtering */
  readonly category: 'tree' | 'light' | 'furniture' | 'structure' | 'decoration' | 'vehicle';
}

export interface EnvironmentObject {
  readonly group: Group;
  readonly meta: EnvironmentObjectMeta;
}

// ── Coconut Tree ────────────────────────────────────────────────────

export function createCoconutTree(variant: number = 0): EnvironmentObject {
  const tree = new Group();
  tree.name = 'coconutTree';

  // Trunk — slight curve variation per variant
  const trunkHeight = 2.6 + variant * 0.4;
  const matWood = toon(COLORS.WOOD_LIGHT);
  const trunk = createToonMesh(
    new CylinderGeometry(0.13, 0.23, trunkHeight, 8), matWood, 0.02,
  );
  trunk.position.y = trunkHeight / 2;
  trunk.rotation.z = (variant % 3 - 1) * 0.05; // slight lean
  trunk.castShadow = true;
  tree.add(trunk);

  // Leaves
  const matLeaves = toon(COLORS.LEAF_GREEN);
  const leafCount = 5 + (variant % 2);
  for (let i = 0; i < leafCount; i++) {
    const leaf = createToonMesh(
      new BoxGeometry(1.6 + variant * 0.2, 0.08, 0.5), matLeaves, 0.02,
    );
    const angle = (Math.PI * 2 / leafCount) * i;
    leaf.position.set(
      Math.cos(angle) * 0.7,
      trunkHeight + 0.1,
      -Math.sin(angle) * 0.7,
    );
    leaf.rotation.y = angle;
    leaf.rotation.z = 0.25 + (variant % 2) * 0.1;
    leaf.castShadow = true;
    tree.add(leaf);
  }

  // Coconuts (small spheres)
  if (variant % 3 !== 0) {
    const matCoconut = toon(COLORS.COCONUT_BROWN);
    for (let i = 0; i < 2 + (variant % 2); i++) {
      const coconut = new Mesh(new SphereGeometry(0.08, 6, 6), matCoconut);
      const a = Math.random() * Math.PI * 2;
      coconut.position.set(
        Math.cos(a) * 0.2,
        trunkHeight - 0.15,
        Math.sin(a) * 0.2,
      );
      tree.add(coconut);
    }
  }

  return {
    group: tree,
    meta: { collisionRadius: 0.8, interactable: false, category: 'tree' },
  };
}

// ── Streetlight ─────────────────────────────────────────────────────

export function createStreetLight(): EnvironmentObject {
  const g = new Group();
  g.name = 'streetLight';

  const post = new Mesh(
    new CylinderGeometry(0.06, 0.08, 3.5, 8),
    toon(COLORS.METAL_DARK),
  );
  post.position.y = 1.75;
  post.castShadow = true;
  g.add(post);

  const head = new Mesh(
    new BoxGeometry(0.8, 0.15, 0.15),
    toon(COLORS.METAL_DARK),
  );
  head.position.set(0.3, 3.5, 0);
  g.add(head);

  const bulb = new Mesh(
    new SphereGeometry(0.08, 8, 8),
    toon(0xfff5b3, { emissive: 0xfff5b3, emissiveIntensity: 0.8 }),
  );
  bulb.position.set(0.6, 3.4, 0);
  g.add(bulb);

  return {
    group: g,
    meta: { collisionRadius: 0.3, interactable: false, category: 'light' },
  };
}

// ── Bench ───────────────────────────────────────────────────────────

export function createBench(): EnvironmentObject {
  const g = new Group();
  g.name = 'bench';
  const woodMat = toon(COLORS.WOOD_DARK);

  // Seat
  const seat = createToonMesh(new BoxGeometry(1.4, 0.08, 0.5), woodMat, 0.02);
  seat.position.y = 0.5;
  seat.castShadow = true;
  g.add(seat);

  // Back rest
  const back = createToonMesh(new BoxGeometry(1.4, 0.5, 0.06), woodMat, 0.02);
  back.position.set(0, 0.75, -0.22);
  back.castShadow = true;
  g.add(back);

  // Legs (4)
  const legGeo = new CylinderGeometry(0.03, 0.03, 0.5, 6);
  const legPositions = [
    [-0.6, 0.25, 0.18], [0.6, 0.25, 0.18],
    [-0.6, 0.25, -0.18], [0.6, 0.25, -0.18],
  ];
  for (const [lx, ly, lz] of legPositions) {
    const leg = new Mesh(legGeo, toon(COLORS.IRON));
    leg.position.set(lx!, ly!, lz!);
    g.add(leg);
  }

  return {
    group: g,
    meta: { collisionRadius: 0.8, interactable: false, category: 'furniture' },
  };
}

// ── Bus Stop ────────────────────────────────────────────────────────

export function createBusStop(): EnvironmentObject {
  const g = new Group();
  g.name = 'busStop';

  // Roof
  const roof = createToonMesh(
    new BoxGeometry(3.0, 0.12, 1.5),
    toon(COLORS.METAL_MEDIUM),
    0.02,
  );
  roof.position.y = 2.8;
  roof.castShadow = true;
  g.add(roof);

  // Poles (2)
  const poleMat = toon(COLORS.METAL_DARK);
  for (const px of [-1.3, 1.3]) {
    const pole = new Mesh(new CylinderGeometry(0.04, 0.04, 2.8, 8), poleMat);
    pole.position.set(px, 1.4, 0.65);
    pole.castShadow = true;
    g.add(pole);
  }

  // Back panel
  const panel = createToonMesh(
    new BoxGeometry(3.0, 1.8, 0.06),
    toon(COLORS.WALL_WHITE),
    0.02,
  );
  panel.position.set(0, 1.7, -0.7);
  g.add(panel);

  // Bench inside
  const benchSeat = createToonMesh(
    new BoxGeometry(2.4, 0.08, 0.4),
    toon(COLORS.WOOD_DARK),
    0.02,
  );
  benchSeat.position.set(0, 0.55, 0);
  g.add(benchSeat);

  return {
    group: g,
    meta: { collisionRadius: 1.8, interactable: true, category: 'structure' },
  };
}

// ── Tea Shop ────────────────────────────────────────────────────────

export function createTeaShop(): EnvironmentObject {
  const g = new Group();
  g.name = 'teaShop';

  // Main structure
  const body = createToonMesh(
    new BoxGeometry(3.5, 2.8, 3.0),
    toon(COLORS.WALL_CREAM),
    0.02,
  );
  body.position.y = 1.4;
  body.castShadow = true;
  g.add(body);

  // Roof
  const roof = createToonMesh(
    new ConeGeometry(3.2, 1.5, 4),
    toon(COLORS.ROOF_TERRACOTTA),
    0.02,
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.6;
  roof.castShadow = true;
  g.add(roof);

  // Counter
  const counter = createToonMesh(
    new BoxGeometry(2.0, 0.8, 0.3),
    toon(COLORS.WOOD_LIGHT),
    0.02,
  );
  counter.position.set(0, 0.4, 1.6);
  g.add(counter);

  // Sign board
  const sign = createToonMesh(
    new BoxGeometry(1.8, 0.4, 0.06),
    toon(0xfef3c7),
    0.02,
  );
  sign.position.set(0, 3.1, 1.55);
  g.add(sign);

  return {
    group: g,
    meta: { collisionRadius: 2.2, interactable: true, category: 'structure' },
  };
}

// ── Sign Board ──────────────────────────────────────────────────────

export function createSignBoard(_text?: string): EnvironmentObject {
  const g = new Group();
  g.name = 'signBoard';

  const post = createToonMesh(
    new CylinderGeometry(0.05, 0.05, 1.6, 8),
    toon(COLORS.WOOD_DARK),
    0.02,
  );
  post.position.y = 0.8;
  g.add(post);

  const face = createToonMesh(
    new BoxGeometry(1.0, 0.6, 0.06),
    toon(0xfef3c7),
    0.02,
  );
  face.position.set(0, 1.7, 0);
  g.add(face);

  return {
    group: g,
    meta: { collisionRadius: 0.4, interactable: true, category: 'decoration' },
  };
}

// ── Flower Bed ──────────────────────────────────────────────────────

export function createFlowerBed(variant: number = 0): EnvironmentObject {
  const g = new Group();
  g.name = 'flowerBed';

  // Soil mound
  const soil = createToonMesh(
    new CylinderGeometry(1.2, 1.4, 0.2, 8),
    toon(0x5c4033),
    0.02,
  );
  soil.position.y = 0.1;
  g.add(soil);

  // Flowers — random colors
  const flowerColors = [0xff6b6b, 0xffd93d, 0xff8e72, 0xc084fc, 0x67e8f9];
  const count = 6 + variant * 2;
  for (let i = 0; i < count; i++) {
    const flower = new Mesh(
      new SphereGeometry(0.1, 6, 6),
      toon(flowerColors[i % flowerColors.length]!),
    );
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.9;
    flower.position.set(Math.cos(a) * r, 0.25 + Math.random() * 0.15, Math.sin(a) * r);
    g.add(flower);

    // Stems
    const stem = new Mesh(
      new CylinderGeometry(0.01, 0.01, 0.2, 4),
      toon(0x22c55e),
    );
    stem.position.set(flower.position.x, 0.15, flower.position.z);
    g.add(stem);
  }

  return {
    group: g,
    meta: { collisionRadius: 1.2, interactable: false, category: 'decoration' },
  };
}

// ── Electric Pole ───────────────────────────────────────────────────

export function createElectricPole(): EnvironmentObject {
  const g = new Group();
  g.name = 'electricPole';

  const pole = new Mesh(
    new CylinderGeometry(0.08, 0.1, 6, 8),
    toon(COLORS.METAL_MEDIUM),
  );
  pole.position.y = 3;
  pole.castShadow = true;
  g.add(pole);

  // Crossbar
  const crossbar = new Mesh(
    new BoxGeometry(1.8, 0.08, 0.08),
    toon(COLORS.WOOD_DARK),
  );
  crossbar.position.y = 5.5;
  g.add(crossbar);

  // Insulators
  for (const ix of [-0.7, 0, 0.7]) {
    const insulator = new Mesh(
      new CylinderGeometry(0.03, 0.02, 0.15, 6),
      toon(0xd1d5db),
    );
    insulator.position.set(ix, 5.6, 0);
    g.add(insulator);
  }

  return {
    group: g,
    meta: { collisionRadius: 0.4, interactable: false, category: 'structure' },
  };
}

// ── Boat ────────────────────────────────────────────────────────────

export function createBoat(): EnvironmentObject {
  const g = new Group();
  g.name = 'boat';

  // Hull
  const hull = createToonMesh(
    new BoxGeometry(1.2, 0.4, 3.0),
    toon(COLORS.WOOD_DARK),
    0.02,
  );
  hull.position.y = 0.15;
  g.add(hull);

  // Prow (front taper)
  const prow = createToonMesh(
    new ConeGeometry(0.6, 1.2, 4),
    toon(COLORS.WOOD_DARK),
    0.02,
  );
  prow.rotation.x = Math.PI / 2;
  prow.position.set(0, 0.15, -2.0);
  g.add(prow);

  // Seat plank
  const seat = createToonMesh(
    new BoxGeometry(0.9, 0.06, 0.3),
    toon(COLORS.WOOD_LIGHT),
    0.02,
  );
  seat.position.set(0, 0.4, 0);
  g.add(seat);

  return {
    group: g,
    meta: { collisionRadius: 1.8, interactable: true, category: 'vehicle' },
  };
}
