// ── KL DevVerse — House Interior ─────────────────────────────────────
// Procedural low-poly house interior geometry using Three.js.
// Matches the existing art style: MeshToonMaterial, soft outlines.

import {
  Group,
  Mesh,
  BoxGeometry,
  PlaneGeometry,
  CylinderGeometry,
  SphereGeometry,
  MeshToonMaterial,
  MeshBasicMaterial,
  Color,
  BackSide,
  DoubleSide,
} from 'three';
import { HOUSE } from '@/shared/constants';
import type { HouseTheme } from '@/shared/types';

// ── Toon Mesh Helper (matches world style) ─────────────────────────

function toonMesh(
  geo: ConstructorParameters<typeof Mesh>[0],
  mat: MeshToonMaterial,
  outlineThickness = 0.03,
): Mesh {
  const mesh = new Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (outlineThickness > 0) {
    const outline = new Mesh(geo, new MeshBasicMaterial({ color: 0x2c2d30, side: BackSide }));
    outline.scale.setScalar(1 + outlineThickness);
    mesh.add(outline);
  }
  return mesh;
}

// ── Theme Colors ────────────────────────────────────────────────────

function getThemeColors(theme: HouseTheme) {
  const themeData = HOUSE.THEMES.find(t => t.id === theme) ?? HOUSE.THEMES[0]!;
  return {
    wall: new Color(themeData.wallColor),
    floor: new Color(themeData.floorColor),
    accent: new Color(themeData.accent),
  };
}

// ── Build Interior ──────────────────────────────────────────────────

export function createHouseInterior(theme: HouseTheme = 'default'): Group {
  const group = new Group();
  group.name = 'houseInterior';

  const W = HOUSE.INTERIOR_WIDTH;
  const D = HOUSE.INTERIOR_DEPTH;
  const H = HOUSE.INTERIOR_HEIGHT;
  const T = HOUSE.WALL_THICKNESS;

  const colors = getThemeColors(theme);

  const matWall  = new MeshToonMaterial({ color: colors.wall });
  const matFloor = new MeshToonMaterial({ color: colors.floor });
  const matCeil  = new MeshToonMaterial({ color: colors.wall.clone().offsetHSL(0, 0, 0.05) });
  const matTrim  = new MeshToonMaterial({ color: colors.accent });

  // ── Floor ─────────────────────────────────────────────────────────
  const floor = toonMesh(new BoxGeometry(W, 0.1, D), matFloor, 0);
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  group.add(floor);

  // Floor grid pattern (subtle)
  const gridMat = new MeshToonMaterial({
    color: colors.floor.clone().offsetHSL(0, 0, -0.03),
    transparent: true,
    opacity: 0.3,
  });
  for (let x = -W / 2 + 1; x < W / 2; x += 2) {
    for (let z = -D / 2 + 1; z < D / 2; z += 2) {
      const tile = new Mesh(new PlaneGeometry(1.8, 1.8), gridMat);
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x, 0.06, z);
      group.add(tile);
    }
  }

  // ── Ceiling ───────────────────────────────────────────────────────
  const ceiling = toonMesh(new BoxGeometry(W, 0.1, D), matCeil, 0);
  ceiling.position.set(0, H, 0);
  group.add(ceiling);

  // ── Walls ─────────────────────────────────────────────────────────

  // Back wall (north)
  const backWall = toonMesh(new BoxGeometry(W, H, T), matWall, 0.02);
  backWall.position.set(0, H / 2, -D / 2);
  backWall.name = 'wall_north';
  group.add(backWall);

  // Left wall (west)
  const leftWall = toonMesh(new BoxGeometry(T, H, D), matWall, 0.02);
  leftWall.position.set(-W / 2, H / 2, 0);
  leftWall.name = 'wall_west';
  group.add(leftWall);

  // Right wall (east)
  const rightWall = toonMesh(new BoxGeometry(T, H, D), matWall, 0.02);
  rightWall.position.set(W / 2, H / 2, 0);
  rightWall.name = 'wall_east';
  group.add(rightWall);

  // Front wall (south) with door cutout — two segments
  const doorW = HOUSE.DOOR_WIDTH;
  const doorH = HOUSE.DOOR_HEIGHT;
  const sideW = (W - doorW) / 2;

  // Left segment
  const frontLeft = toonMesh(new BoxGeometry(sideW, H, T), matWall, 0.02);
  frontLeft.position.set(-W / 2 + sideW / 2, H / 2, D / 2);
  group.add(frontLeft);

  // Right segment
  const frontRight = toonMesh(new BoxGeometry(sideW, H, T), matWall, 0.02);
  frontRight.position.set(W / 2 - sideW / 2, H / 2, D / 2);
  group.add(frontRight);

  // Above door
  const aboveDoor = toonMesh(new BoxGeometry(doorW, H - doorH, T), matWall, 0.02);
  aboveDoor.position.set(0, doorH + (H - doorH) / 2, D / 2);
  group.add(aboveDoor);

  // ── Door Frame ────────────────────────────────────────────────────
  const frameMat = new MeshToonMaterial({ color: colors.accent.clone().offsetHSL(0, -0.2, -0.1) });

  const leftFrame = toonMesh(new BoxGeometry(0.08, doorH, 0.12), frameMat);
  leftFrame.position.set(-doorW / 2, doorH / 2, D / 2);
  group.add(leftFrame);

  const rightFrame = toonMesh(new BoxGeometry(0.08, doorH, 0.12), frameMat);
  rightFrame.position.set(doorW / 2, doorH / 2, D / 2);
  group.add(rightFrame);

  const topFrame = toonMesh(new BoxGeometry(doorW + 0.16, 0.08, 0.12), frameMat);
  topFrame.position.set(0, doorH, D / 2);
  group.add(topFrame);

  // ── Baseboard Trim ────────────────────────────────────────────────
  const trimH = 0.08;
  const baseboards = [
    { w: W, x: 0, z: -D / 2 + T / 2 },      // north
    { w: W, x: 0, z: D / 2 - T / 2 },        // south (broken by door)
    { w: D, x: -W / 2 + T / 2, z: 0 },       // west
    { w: D, x: W / 2 - T / 2, z: 0 },        // east
  ];

  for (const bb of baseboards) {
    const isVertical = bb.w === D;
    const trim = toonMesh(
      new BoxGeometry(isVertical ? T + 0.02 : bb.w, trimH, isVertical ? bb.w : T + 0.02),
      matTrim,
      0,
    );
    trim.position.set(bb.x, trimH / 2, bb.z);
    group.add(trim);
  }

  // ── Ceiling Light ─────────────────────────────────────────────────
  const lightFixture = new Group();
  lightFixture.name = 'ceilingLight';

  const lightBase = toonMesh(new CylinderGeometry(0.15, 0.15, 0.05, 12), matTrim);
  lightBase.position.y = H - 0.05;
  lightFixture.add(lightBase);

  const lightBulb = new Mesh(
    new SphereGeometry(0.12, 12, 8),
    new MeshToonMaterial({ color: 0xfff4e0, emissive: 0xfff4e0, emissiveIntensity: 0.3 }),
  );
  lightBulb.position.y = H - 0.15;
  lightFixture.add(lightBulb);

  const lightCord = toonMesh(new CylinderGeometry(0.01, 0.01, 0.3, 6), matTrim, 0);
  lightCord.position.y = H - 0.15;
  lightFixture.add(lightCord);

  lightFixture.position.set(0, 0, 0);
  group.add(lightFixture);

  // ── Room Divider Line (workspace area) ─────────────────────────
  const dividerMat = new MeshToonMaterial({ color: colors.accent, transparent: true, opacity: 0.15 });
  const divider = new Mesh(new PlaneGeometry(0.02, H * 0.6), dividerMat);
  divider.position.set(-W / 4, H * 0.35, 0);
  divider.rotation.y = 0;
  group.add(divider);

  return group;
}

// ── Slot Positions ──────────────────────────────────────────────────
// Predefined positions for furniture placement (slot-based).

import type { FurnitureSlot } from '@/shared/types';

export const HOUSE_FURNITURE_SLOTS: readonly FurnitureSlot[] = [
  // Workspace (left side)
  { slotId: 'workspace_desk_1',    label: 'Workspace Desk',    room: 'workspace',   posX: -4,   posY: 0, posZ: -3,   rotation: 0,     allowedCategories: ['desk', 'table'],      requiredHouseLevel: 1 },
  { slotId: 'workspace_chair_1',   label: 'Workspace Chair',   room: 'workspace',   posX: -4,   posY: 0, posZ: -1.5, rotation: Math.PI, allowedCategories: ['chair'],             requiredHouseLevel: 1 },
  { slotId: 'workspace_monitor_1', label: 'Monitor',           room: 'workspace',   posX: -4,   posY: 0.7, posZ: -3.8, rotation: 0,   allowedCategories: ['monitor', 'laptop'],  requiredHouseLevel: 1 },
  { slotId: 'workspace_lamp_1',    label: 'Desk Lamp',         room: 'workspace',   posX: -5,   posY: 0.7, posZ: -3.5, rotation: 0,   allowedCategories: ['lamp'],               requiredHouseLevel: 1 },
  { slotId: 'workspace_board_1',   label: 'Whiteboard',        room: 'workspace',   posX: -5.5, posY: 1.5, posZ: -4.5, rotation: 0,   allowedCategories: ['whiteboard'],          requiredHouseLevel: 2 },

  // Living Room (right side)
  { slotId: 'living_room_sofa_1',  label: 'Sofa',              room: 'living_room', posX: 3,    posY: 0, posZ: -2,   rotation: -Math.PI / 2, allowedCategories: ['sofa'],          requiredHouseLevel: 1 },
  { slotId: 'living_room_table_1', label: 'Coffee Table',      room: 'living_room', posX: 2,    posY: 0, posZ: -2,   rotation: 0,     allowedCategories: ['table', 'desk'],      requiredHouseLevel: 1 },
  { slotId: 'living_room_shelf_1', label: 'Bookshelf',         room: 'living_room', posX: 4.5,  posY: 0, posZ: -4,   rotation: Math.PI / 2, allowedCategories: ['bookshelf', 'shelf'], requiredHouseLevel: 1 },
  { slotId: 'living_room_plant_1', label: 'Plant Corner',      room: 'living_room', posX: 5,    posY: 0, posZ: 3,    rotation: 0,     allowedCategories: ['plant'],              requiredHouseLevel: 1 },
  { slotId: 'living_room_lamp_1',  label: 'Floor Lamp',        room: 'living_room', posX: 5,    posY: 0, posZ: -1,   rotation: 0,     allowedCategories: ['lamp'],               requiredHouseLevel: 1 },

  // Display Wall (back wall — Level 5+)
  { slotId: 'display_shelf_1',     label: 'Display Shelf',     room: 'display',     posX: 0,    posY: 1.8, posZ: -4.6, rotation: 0,   allowedCategories: ['shelf', 'bookshelf'], requiredHouseLevel: 5 },
  { slotId: 'display_projector_1', label: 'Projector',         room: 'display',     posX: 0,    posY: 2.5, posZ: -4.6, rotation: 0,   allowedCategories: ['projector'],           requiredHouseLevel: 5 },

  // Bedroom (Level 3+)
  { slotId: 'bedroom_bed_1',       label: 'Bed',               room: 'bedroom',     posX: -4,   posY: 0, posZ: 3,    rotation: 0,     allowedCategories: ['sofa'],               requiredHouseLevel: 3 },
  { slotId: 'bedroom_lamp_1',      label: 'Bedside Lamp',      room: 'bedroom',     posX: -5,   posY: 0.5, posZ: 4,  rotation: 0,     allowedCategories: ['lamp'],               requiredHouseLevel: 3 },

  // Expansion (Level 9+)
  { slotId: 'expansion_slot_1',    label: 'Expansion 1',       room: 'expansion',   posX: 0,    posY: 0, posZ: 2,    rotation: 0,     allowedCategories: ['desk', 'table', 'sofa', 'bookshelf', 'plant'], requiredHouseLevel: 9 },
  { slotId: 'expansion_slot_2',    label: 'Expansion 2',       room: 'expansion',   posX: 2,    posY: 0, posZ: 2,    rotation: 0,     allowedCategories: ['desk', 'table', 'sofa', 'bookshelf', 'plant'], requiredHouseLevel: 9 },
] as const;

/** Get available slots for a given house level */
export function getAvailableSlots(houseLevel: number): readonly FurnitureSlot[] {
  return HOUSE_FURNITURE_SLOTS.filter(s => s.requiredHouseLevel <= houseLevel);
}
