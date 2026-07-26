// ── KL DevVerse — Studio Interior ────────────────────────────────────
// Procedural low-poly Builder Studio interior geometry using Three.js.
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
} from 'three';
import { STUDIO } from '@/shared/constants';
import type { StudioTheme } from '@/shared/types';

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

function getThemeColors(theme: StudioTheme) {
  const themeData = STUDIO.THEMES.find(t => t.id === theme) ?? STUDIO.THEMES[0]!;
  return {
    wall: new Color(themeData.wallColor),
    floor: new Color(themeData.floorColor),
    accent: new Color(themeData.accent),
  };
}

// ── Build Interior ──────────────────────────────────────────────────

export function createStudioInterior(theme: StudioTheme = 'default'): Group {
  const group = new Group();
  group.name = 'studioInterior';

  const W = STUDIO.INTERIOR_WIDTH;
  const D = STUDIO.INTERIOR_DEPTH;
  const H = STUDIO.INTERIOR_HEIGHT;
  const T = STUDIO.WALL_THICKNESS;

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
  const doorW = STUDIO.DOOR_WIDTH;
  const doorH = STUDIO.DOOR_HEIGHT;
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

export const STUDIO_FURNITURE_SLOTS: readonly FurnitureSlot[] = [
  // Main Workspace (left side)
  { slotId: 'workspace_desk_1',    label: 'Dev Desk',          room: 'main_workspace', posX: -4,   posY: 0,   posZ: -3,   rotation: 0,            allowedCategories: ['desk', 'table'],      requiredStudioTier: 1 },
  { slotId: 'workspace_chair_1',   label: 'Dev Chair',         room: 'main_workspace', posX: -4,   posY: 0,   posZ: -1.5, rotation: Math.PI,      allowedCategories: ['chair'],               requiredStudioTier: 1 },
  { slotId: 'workspace_monitor_1', label: 'Monitor',           room: 'main_workspace', posX: -4,   posY: 0.7, posZ: -3.8, rotation: 0,            allowedCategories: ['monitor', 'laptop'],   requiredStudioTier: 1 },
  { slotId: 'workspace_lamp_1',    label: 'Desk Lamp',         room: 'main_workspace', posX: -5,   posY: 0.7, posZ: -3.5, rotation: 0,            allowedCategories: ['lamp'],                requiredStudioTier: 1 },
  { slotId: 'workspace_board_1',   label: 'Whiteboard',        room: 'main_workspace', posX: -5.5, posY: 1.5, posZ: -4.5, rotation: 0,            allowedCategories: ['whiteboard'],           requiredStudioTier: 2 },

  // Lounge (right side — Tier 3+)
  { slotId: 'lounge_sofa_1',       label: 'Sofa',              room: 'lounge',         posX: 3,    posY: 0,   posZ: -2,   rotation: -Math.PI / 2, allowedCategories: ['sofa'],                requiredStudioTier: 1 },
  { slotId: 'lounge_table_1',      label: 'Coffee Table',      room: 'lounge',         posX: 2,    posY: 0,   posZ: -2,   rotation: 0,            allowedCategories: ['table', 'desk'],       requiredStudioTier: 1 },
  { slotId: 'lounge_shelf_1',      label: 'Bookshelf',         room: 'lounge',         posX: 4.5,  posY: 0,   posZ: -4,   rotation: Math.PI / 2,  allowedCategories: ['bookshelf', 'shelf'],  requiredStudioTier: 1 },
  { slotId: 'lounge_plant_1',      label: 'Plant Corner',      room: 'lounge',         posX: 5,    posY: 0,   posZ: 3,    rotation: 0,            allowedCategories: ['plant'],               requiredStudioTier: 1 },
  { slotId: 'lounge_lamp_1',       label: 'Floor Lamp',        room: 'lounge',         posX: 5,    posY: 0,   posZ: -1,   rotation: 0,            allowedCategories: ['lamp'],                requiredStudioTier: 1 },

  // Display Wall (back wall — Tier 5+)
  { slotId: 'display_shelf_1',     label: 'Display Shelf',     room: 'display',        posX: 0,    posY: 1.8, posZ: -4.6, rotation: 0,            allowedCategories: ['shelf', 'bookshelf'],  requiredStudioTier: 5 },
  { slotId: 'display_projector_1', label: 'Projector',         room: 'display',        posX: 0,    posY: 2.5, posZ: -4.6, rotation: 0,            allowedCategories: ['projector'],            requiredStudioTier: 5 },

  // Server Room (Tier 6+)
  { slotId: 'server_rack_1',       label: 'Server Rack',       room: 'server_room',    posX: -4,   posY: 0,   posZ: 3,    rotation: 0,            allowedCategories: ['sofa'],                requiredStudioTier: 6 },
  { slotId: 'server_lamp_1',       label: 'Server Room Lamp',  room: 'server_room',    posX: -5,   posY: 0.5, posZ: 4,    rotation: 0,            allowedCategories: ['lamp'],                requiredStudioTier: 6 },

  // Meeting Room (Tier 9+)
  { slotId: 'meeting_slot_1',      label: 'Meeting Table',     room: 'meeting',        posX: 0,    posY: 0,   posZ: 2,    rotation: 0,            allowedCategories: ['desk', 'table', 'sofa', 'bookshelf', 'plant'], requiredStudioTier: 9 },
  { slotId: 'meeting_slot_2',      label: 'Meeting Chairs',    room: 'meeting',        posX: 2,    posY: 0,   posZ: 2,    rotation: 0,            allowedCategories: ['desk', 'table', 'sofa', 'bookshelf', 'plant'], requiredStudioTier: 9 },
] as const;

/** Get available slots for a given studio tier */
export function getAvailableSlots(studioTier: number): readonly FurnitureSlot[] {
  return STUDIO_FURNITURE_SLOTS.filter(s => s.requiredStudioTier <= studioTier);
}
