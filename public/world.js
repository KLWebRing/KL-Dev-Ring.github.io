/**
 * KL Dev-Ring — World Mode v4 (world.js)
 * =========================================
 * "Summer Afternoon" — character-driven trailing camera.
 *
 * Fixed in v4:
 *  - Fences only spawn on plots with actual builders          ← FIXED
 *  - Interior camera teleports inside the room on enter       ← FIXED
 *  - Scene fog/background disabled inside, restored on exit   ← FIXED
 *
 * New in v4 — "Summer Afternoon" controls:
 *  - Character-driven steering: W runs forward, A/D steer,
 *    S turns 180° and runs; all relative to player facing.
 *  - Hold LMB / touch → run; mouse-left/right → steer.
 *  - Trailing camera: lerps behind player with organic delay.
 *
 * Sections:
 *  1.  Constants & Palette
 *  2.  Module State
 *  3.  Scene / Renderer / Camera
 *  4.  Lighting
 *  5.  Ground & Roads
 *  6.  House Builder (solid exterior)
 *  7.  Interior Cell Builder
 *  8.  NPC Builder
 *  9.  Player Builder
 * 10.  Village Spawner (fence bug fix)
 * 11.  Character Movement & Trailing Camera (v4 overhaul)
 * 12.  Proximity & Interaction Checks
 * 13.  Interior Stats Panel (HUD)
 * 14.  Animation Loop
 * 15.  Public API — initWorld / destroyWorld
 */

import * as THREE from "three";

// ─────────────────────────────────────────────────────────
// 1. CONSTANTS & PALETTE
// ─────────────────────────────────────────────────────────

const PLOT_SPACING = 22;
const NAMETAG_RADIUS = 7;
const DOOR_ENTER_RADIUS = 2.5;
const DOOR_EXIT_RADIUS = 2.5;
const DESK_INTERACT_RADIUS = 2.0;

/** Movement */
const MOVE_SPEED = 8.0;   // units/second forward speed
const STEER_SPEED = 2.6;   // radians/second for A/D key steering
const STEER_LERP = 0.14;  // fraction per frame — how snappy steering feels
const MOUSE_STEER = 0.006; // radians per pointer-pixel moved horizontally
const PLAYER_RADIUS = 0.35;

/** Trailing camera */
const CAM_BEHIND = 9.0;  // units behind player
const CAM_HEIGHT = 5.2;  // units above player base
const CAM_LERP = 0.055; // lower = more organic trailing delay
const CAM_LOOK_OFFSET = 1.6;  // height above player position to look at

/** Interior cam offset from cell centre */
const CAM_INTERIOR_OFFSET = new THREE.Vector3(0, 2.0, 2.5);

/** House geometry */
const HOUSE_W = 5.0;
const HOUSE_D = 5.0;
const HOUSE_H = 3.5;

/** Interior Cell — isolated at world offset to avoid bleed-through */
const CELL_ORIGIN = new THREE.Vector3(500, 0, 0);
const CELL_W = 8;
const CELL_D = 8;
const CELL_H = 3.5;

/** Fence */
const FENCE_POST_H = 0.85;
const FENCE_PLOT_R = PLOT_SPACING * 0.44;
const FENCE_GAP_H = 1.5;

/** Sky / fog colours */
const SKY_COLOR = 0x8ecde6;
const FOG_NEAR = 55;
const FOG_FAR = 110;

/** Palette */
const HOUSE_COLORS = [0xf7c59f, 0xa8d8ea, 0xffd166, 0xc7f2a4, 0xe8d5b7, 0xf4a0a0, 0xb5ead7, 0xffd6a5];
const ROOF_COLOR = 0xc0624a;
const SHIRT_COLORS = [0x4fc3f7, 0xaed581, 0xffb74d, 0xf48fb1, 0xce93d8, 0x80cbc4];
const GRASS_COLOR = 0x7ec850;
const ROAD_COLOR = 0xc8b89a;
const OUTLINE_COLOR = 0x1a1a1a;
const FENCE_COLOR = 0xf0ead6;

// ─────────────────────────────────────────────────────────
// 2. MODULE STATE
// ─────────────────────────────────────────────────────────

const W = {
  // Three.js core
  renderer: null,
  scene: null,
  camera: null,
  clock: null,
  rafId: null,

  // Scene groups for visibility toggling
  villageGroup: null,
  interiorGroup: null,

  // Player
  player: null,
  playerPos: new THREE.Vector3(0, 0, 0),
  playerLegs: [],

  // Character steering state
  playerYaw: 0,       // current facing angle (radians; +Y axis, CCW)
  targetYaw: 0,       // desired yaw after A/D steering
  sKeyWasDown: false,   // edge-detect for S-key 180° flip
  camCurrentPos: new THREE.Vector3(0, CAM_HEIGHT, CAM_BEHIND), // lerped camera pos

  // Pointer / touch drive
  pointerDown: false,
  pointerLastX: 0,      // last X for delta steering

  // State machine: "exterior" | "interior"
  mode: "exterior",

  // Active interior data
  activeInteriorBuilder: null,
  savedExteriorPos: null,

  // Plots & colliders
  plots: [],
  exteriorColliders: [],
  interiorColliders: [],

  // Interior cell positions
  interiorDoorPos: null,
  interiorDeskPos: null,
  activeDeskData: null,

  // UI elements (cached on init)
  nametag: null,
  interiorPanel: null,
  loader: null,
  enterPromptEl: null,
  deskPromptEl: null,

  // Input
  keys: new Set(),

  // Bound handlers (stored for cleanup)
  boundOnKey: null,
  boundOnResize: null,
  boundPtrDown: null,
  boundPtrMove: null,
  boundPtrUp: null,
  boundTouchStart: null,
  boundTouchMove: null,
  boundTouchEnd: null,
};

// ─────────────────────────────────────────────────────────
// 3. SCENE / RENDERER / CAMERA
// ─────────────────────────────────────────────────────────

function initScene(canvas) {
  W.scene = new THREE.Scene();
  W.scene.background = new THREE.Color(SKY_COLOR);
  W.scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);

  W.renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  W.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  W.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  W.renderer.outputColorSpace = THREE.SRGBColorSpace;
  W.renderer.shadowMap.enabled = true;
  W.renderer.shadowMap.type = THREE.BasicShadowMap;

  W.camera = new THREE.PerspectiveCamera(
    68, canvas.clientWidth / canvas.clientHeight, 0.1, 200
  );

  W.clock = new THREE.Clock();

  W.villageGroup = new THREE.Group();
  W.interiorGroup = new THREE.Group();
  W.interiorGroup.visible = false;

  W.scene.add(W.villageGroup);
  W.scene.add(W.interiorGroup);
}

// ─────────────────────────────────────────────────────────
// 4. LIGHTING
// ─────────────────────────────────────────────────────────

function initLighting() {
  W.scene.add(new THREE.AmbientLight(0xfff4e0, 0.9));

  const sun = new THREE.DirectionalLight(0xffdd99, 2.2);
  sun.position.set(-14, 22, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -120;
  sun.shadow.camera.right = 120;
  sun.shadow.camera.top = 120;
  sun.shadow.camera.bottom = -120;
  W.scene.add(sun);

  const fill = new THREE.DirectionalLight(0xb2d8ff, 0.5);
  fill.position.set(14, 10, -12);
  W.scene.add(fill);
}

// ─────────────────────────────────────────────────────────
// 5. GROUND & ROADS
// ─────────────────────────────────────────────────────────

function buildGround() {
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshToonMaterial({ color: GRASS_COLOR })
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  W.villageGroup.add(grass);

  const roadMat = new THREE.MeshToonMaterial({ color: ROAD_COLOR });
  [[5, 400, 0, 0], [400, 5, 0, 0]].forEach(([w, l, x, z]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.005, z);
    m.receiveShadow = true;
    W.villageGroup.add(m);
  });

  const markMat = new THREE.MeshToonMaterial({ color: 0xddd0b3 });
  for (let i = -12; i <= 12; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.8), markMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(i * 3, 0.012, 0);
    W.villageGroup.add(m);
  }
}

// ─────────────────────────────────────────────────────────
// 6. HOUSE BUILDER (solid exterior)
// ─────────────────────────────────────────────────────────

function makeOutline(geo, scale = 1.065) {
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide })
  );
  m.scale.setScalar(scale);
  return m;
}

function darken(hex, amount) {
  const r = ((hex >> 16) & 0xff) * (1 - amount);
  const g = ((hex >> 8) & 0xff) * (1 - amount);
  const b = (hex & 0xff) * (1 - amount);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

function getRoadFacingRotation(pos) {
  const dNS = Math.abs(pos.x);
  const dEW = Math.abs(pos.z);
  if (dNS <= dEW) return pos.x > 0 ? -Math.PI / 2 : Math.PI / 2;
  return pos.z > 0 ? Math.PI : 0;
}

/** Build a solid house. Returns { group, doorWorldPos }. */
function buildHouse(builder, position, index, rotY) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = rotY;

  const wallColor = HOUSE_COLORS[index % HOUSE_COLORS.length];
  const wallMat = new THREE.MeshToonMaterial({ color: wallColor });
  const hd = HOUSE_D / 2;

  // Solid walls
  const wallGeo = new THREE.BoxGeometry(HOUSE_W, HOUSE_H, HOUSE_D);
  const walls = new THREE.Mesh(wallGeo, wallMat);
  walls.position.y = HOUSE_H / 2;
  walls.castShadow = walls.receiveShadow = true;
  group.add(walls);
  const wallOl = makeOutline(wallGeo, 1.04);
  wallOl.position.y = HOUSE_H / 2;
  group.add(wallOl);

  // Roof
  const roofGeo = new THREE.ConeGeometry(4.1, 2.3, 4);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshToonMaterial({ color: ROOF_COLOR }));
  roof.rotation.y = Math.PI / 4;
  roof.position.y = HOUSE_H + 1.15;
  roof.castShadow = true;
  group.add(roof);
  const roofOl = makeOutline(roofGeo, 1.04);
  roofOl.rotation.y = Math.PI / 4;
  roofOl.position.y = HOUSE_H + 1.15;
  group.add(roofOl);

  // Windows
  const winGeo = new THREE.BoxGeometry(0.9, 0.85, 0.06);
  const winMat = new THREE.MeshToonMaterial({ color: 0x9ee3f5 });
  [-1.5, 1.5].forEach((x) => {
    const w = new THREE.Mesh(winGeo, winMat);
    w.position.set(x, 2.2, hd);
    group.add(w);
  });
  const bw = new THREE.Mesh(winGeo, winMat);
  bw.position.set(0, 2.2, -hd);
  group.add(bw);

  // Chimney
  const chimGeo = new THREE.BoxGeometry(0.5, 1.3, 0.5);
  const chim = new THREE.Mesh(chimGeo, new THREE.MeshToonMaterial({ color: 0x8b6355 }));
  chim.position.set(1.6, HOUSE_H + 0.8, -1.6);
  chim.castShadow = true;
  group.add(chim);

  // Door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.9, 0.08),
    new THREE.MeshToonMaterial({ color: 0x5c3d1e })
  );
  door.position.set(0, 0.95, hd + 0.01);
  group.add(door);

  // Door frame
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 2.0, 0.06),
    new THREE.MeshToonMaterial({ color: 0xc2a87e })
  );
  frame.position.set(0, 1.0, hd + 0.02);
  group.add(frame);

  // Step
  const step = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.18, 0.5),
    new THREE.MeshToonMaterial({ color: 0xc2a87e })
  );
  step.position.set(0, 0.09, hd + 0.28);
  group.add(step);

  // Name sign
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.45, 0.06),
    new THREE.MeshToonMaterial({ color: darken(wallColor, 0.3) })
  );
  sign.position.set(0, HOUSE_H - 0.3, hd + 0.04);
  group.add(sign);

  group.userData.builder = builder;

  // World-space door position
  const localDoor = new THREE.Vector3(0, 0, hd + 0.6);
  localDoor.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  localDoor.add(position);

  return { group, doorWorldPos: localDoor };
}

/**
 * Register world-space AABB for a solid house box (rotated).
 * For 0° or ±90° rotations only, we compute the world AABB.
 */
function registerHouseAABB(pos, rotY) {
  const cosR = Math.abs(Math.cos(rotY));
  const sinR = Math.abs(Math.sin(rotY));
  const wHW = cosR * HOUSE_W / 2 + sinR * HOUSE_D / 2;
  const wHD = sinR * HOUSE_W / 2 + cosR * HOUSE_D / 2;
  W.exteriorColliders.push(new THREE.Box3(
    new THREE.Vector3(pos.x - wHW - 0.25, -0.5, pos.z - wHD - 0.25),
    new THREE.Vector3(pos.x + wHW + 0.25, HOUSE_H + 1, pos.z + wHD + 0.25)
  ));
}

/**
 * Register room-wall AABBs for the interior cell.
 */
function registerInteriorAABBs() {
  const ox = CELL_ORIGIN.x, oz = CELL_ORIGIN.z;
  const hw = CELL_W / 2, hd = CELL_D / 2;
  const t = 0.3, h = CELL_H + 0.5;
  [
    [ox - hw - t, oz - hd, ox - hw + t, oz + hd],  // west
    [ox + hw - t, oz - hd, ox + hw + t, oz + hd],  // east
    [ox - hw, oz - hd - t, ox + hw, oz - hd + t],  // north (back)
    // south (front) — two pieces with door gap
    [ox - hw, oz + hd - t, ox - 0.6, oz + hd + t],
    [ox + 0.6, oz + hd - t, ox + hw, oz + hd + t],
  ].forEach(([x0, z0, x1, z1]) => {
    W.interiorColliders.push(new THREE.Box3(
      new THREE.Vector3(Math.min(x0, x1), -0.5, Math.min(z0, z1)),
      new THREE.Vector3(Math.max(x0, x1), h, Math.max(z0, z1))
    ));
  });
}

// ─────────────────────────────────────────────────────────
// 7. INTERIOR CELL BUILDER
// ─────────────────────────────────────────────────────────

function buildInteriorCell() {
  const g = W.interiorGroup;
  const ox = CELL_ORIGIN.x, oz = CELL_ORIGIN.z;
  const hw = CELL_W / 2, hd = CELL_D / 2;

  const wallColor = 0xf5ede0;
  const wallMat = new THREE.MeshToonMaterial({ color: wallColor, side: THREE.DoubleSide });

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CELL_W, CELL_D),
    new THREE.MeshToonMaterial({ color: 0xd4a97a })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(ox, 0.01, oz);
  floor.receiveShadow = true;
  g.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(CELL_W, CELL_D),
    new THREE.MeshToonMaterial({ color: darken(wallColor, 0.15), side: THREE.DoubleSide })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(ox, CELL_H, oz);
  g.add(ceil);

  // Walls
  // Back (north)
  mkWall(g, wallMat, CELL_W, CELL_H, ox, CELL_H / 2, oz - hd, 0);
  // Left (west)
  mkWall(g, wallMat, CELL_D, CELL_H, ox - hw, CELL_H / 2, oz, Math.PI / 2);
  // Right (east)
  mkWall(g, wallMat, CELL_D, CELL_H, ox + hw, CELL_H / 2, oz, -Math.PI / 2);
  // Front (south) — two pieces + lintel
  const doorW = 1.1, doorH = 1.9;
  const sideW = (CELL_W - doorW) / 2;
  mkWall(g, wallMat, sideW, CELL_H, ox - doorW / 2 - sideW / 2, CELL_H / 2, oz + hd, Math.PI);
  mkWall(g, wallMat, sideW, CELL_H, ox + doorW / 2 + sideW / 2, CELL_H / 2, oz + hd, Math.PI);
  const lintelH = CELL_H - doorH;
  mkWall(g, wallMat, doorW, lintelH, ox, doorH + lintelH / 2, oz + hd, Math.PI);

  // Exit door mesh
  const exitDoor = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.9, 0.08),
    new THREE.MeshToonMaterial({ color: 0x5c3d1e })
  );
  exitDoor.position.set(ox, 0.95, oz + hd - 0.05);
  g.add(exitDoor);

  // Interior door proximity target
  W.interiorDoorPos = new THREE.Vector3(ox, 0, oz + hd - 1.2);

  // ── Desk ──────────────────────────────────────────────
  const deskZ = oz - hd + 1.5;

  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.08, 0.75),
    new THREE.MeshToonMaterial({ color: 0x7c5a3e })
  );
  desk.position.set(ox, 1.04, deskZ);
  desk.castShadow = true;
  g.add(desk);

  const tlegMat = new THREE.MeshToonMaterial({ color: 0x5c3d1e });
  [[-0.68, 0.15], [0.68, 0.15], [-0.68, -0.35], [0.68, -0.35]].forEach(([dx, dz]) => {
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.98, 0.08), tlegMat);
    tl.position.set(ox + dx, 0.49, deskZ + dz);
    g.add(tl);
  });

  const monMat = new THREE.MeshToonMaterial({ color: 0x1a1a2e });
  const monGeo = new THREE.BoxGeometry(0.72, 0.5, 0.05);
  const monL = new THREE.Mesh(monGeo, monMat);
  monL.position.set(ox - 0.42, 1.41, deskZ - 0.38);
  g.add(monL);
  const monR = new THREE.Mesh(monGeo, monMat);
  monR.position.set(ox + 0.42, 1.41, deskZ - 0.38);
  g.add(monR);

  const scrL = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.38, 0.04),
    new THREE.MeshToonMaterial({ color: 0x00ff88, emissive: 0x007744, emissiveIntensity: 0.8 })
  );
  scrL.position.set(ox - 0.42, 1.41, deskZ - 0.35);
  g.add(scrL);

  const scrR = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.38, 0.04),
    new THREE.MeshToonMaterial({ color: 0x88ccff, emissive: 0x224488, emissiveIntensity: 0.7 })
  );
  scrR.position.set(ox + 0.42, 1.41, deskZ - 0.35);
  g.add(scrR);

  const standMat = new THREE.MeshToonMaterial({ color: 0x333344 });
  [-0.42, 0.42].forEach((dx) => {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, 0.07), standMat);
    st.position.set(ox + dx, 1.21, deskZ - 0.35);
    g.add(st);
  });

  // Chair
  const chairMat = new THREE.MeshToonMaterial({ color: 0x222222 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.65), chairMat);
  seat.position.set(ox, 0.72, deskZ + 0.9);
  g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 0.07), chairMat);
  back.position.set(ox, 1.08, deskZ + 1.22);
  g.add(back);

  // Bookshelf
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.6, 0.9),
    new THREE.MeshToonMaterial({ color: 0x8b6355 })
  );
  shelf.position.set(ox - hw + 0.1, 1.2, oz - 0.5);
  g.add(shelf);
  [0xe63946, 0x457b9d, 0x2a9d8f, 0xe9c46a, 0xf4a261].forEach((bc, bi) => {
    const bk = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.3 + bi * 0.04, 0.65),
      new THREE.MeshToonMaterial({ color: bc })
    );
    bk.position.set(ox - hw + 0.2, 0.55 + bi * 0.38, oz - 0.5);
    g.add(bk);
  });

  // Plant
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.32, 6),
    new THREE.MeshToonMaterial({ color: 0xb05a28 })
  );
  pot.position.set(ox + hw - 0.3, 0.16, oz - hd + 0.3);
  g.add(pot);
  const plant = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 5, 4),
    new THREE.MeshToonMaterial({ color: 0x3dba5e })
  );
  plant.position.set(ox + hw - 0.3, 0.6, oz - hd + 0.3);
  g.add(plant);

  // Rug
  const rug = new THREE.Mesh(
    new THREE.PlaneGeometry(3.0, 2.5),
    new THREE.MeshToonMaterial({ color: 0xb5451b })
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(ox, 0.015, deskZ + 1.2);
  g.add(rug);

  W.interiorDeskPos = new THREE.Vector3(ox, 0, deskZ);

  registerInteriorAABBs();
}

function mkWall(g, mat, w, h, x, y, z, rotY) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  g.add(m);
}

// ─────────────────────────────────────────────────────────
// 8. NPC BUILDER
// ─────────────────────────────────────────────────────────

function buildNPC(index) {
  const npc = new THREE.Group();
  const skin = 0xf5cba7;
  const shirt = SHIRT_COLORS[index % SHIRT_COLORS.length];

  const headGeo = new THREE.SphereGeometry(0.28, 6, 5);
  const head = new THREE.Mesh(headGeo, new THREE.MeshToonMaterial({ color: skin }));
  head.position.y = 1.62;
  head.castShadow = true;
  npc.add(head, makeOutline(headGeo, 1.1));

  const eyeGeo = new THREE.SphereGeometry(0.055, 4, 4);
  const eyeMat = new THREE.MeshToonMaterial({ color: 0x1a1a1a });
  [-0.1, 0.1].forEach((x) => {
    const e = new THREE.Mesh(eyeGeo, eyeMat);
    e.position.set(x, 1.65, 0.24);
    npc.add(e);
  });

  const bodyGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.85, 6);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshToonMaterial({ color: shirt }));
  body.position.y = 1.05;
  body.castShadow = true;
  npc.add(body, makeOutline(bodyGeo, 1.08));

  const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 5);
  const armMat = new THREE.MeshToonMaterial({ color: shirt });
  [-0.34, 0.34].forEach((x, i) => {
    const a = new THREE.Mesh(armGeo, armMat);
    a.position.set(x, 1.05, 0);
    a.rotation.z = i === 0 ? 0.35 : -0.35;
    npc.add(a);
  });

  const legGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.7, 5);
  const legMat = new THREE.MeshToonMaterial({ color: 0x3a5a8c });
  [-0.13, 0.13].forEach((x) => {
    const l = new THREE.Mesh(legGeo, legMat);
    l.position.set(x, 0.35, 0);
    l.castShadow = true;
    npc.add(l);
  });

  const shoeGeo = new THREE.BoxGeometry(0.18, 0.1, 0.25);
  const shoeMat = new THREE.MeshToonMaterial({ color: 0x3b2a1a });
  [-0.13, 0.13].forEach((x) => {
    const s = new THREE.Mesh(shoeGeo, shoeMat);
    s.position.set(x, 0.05, 0.05);
    npc.add(s);
  });

  npc.userData.head = head;
  return npc;
}

// ─────────────────────────────────────────────────────────
// 9. PLAYER BUILDER
// ─────────────────────────────────────────────────────────

function buildPlayer() {
  const player = new THREE.Group();

  const headGeo = new THREE.SphereGeometry(0.32, 6, 5);
  const head = new THREE.Mesh(headGeo, new THREE.MeshToonMaterial({ color: 0xffe4b5 }));
  head.position.y = 1.72;
  head.castShadow = true;
  player.add(head, makeOutline(headGeo, 1.1));

  const bodyGeo = new THREE.CylinderGeometry(0.26, 0.3, 0.9, 6);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshToonMaterial({ color: 0x4a90d9 }));
  body.position.y = 1.1;
  body.castShadow = true;
  player.add(body, makeOutline(bodyGeo, 1.08));

  const legGeo = new THREE.CylinderGeometry(0.11, 0.1, 0.72, 5);
  const legMat = new THREE.MeshToonMaterial({ color: 0x2c3e50 });
  const legs = [];
  [-0.14, 0.14].forEach((x) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(x, 0.36, 0);
    leg.castShadow = true;
    player.add(leg);
    legs.push(leg);
  });

  player.position.set(0, 0, 0);
  W.scene.add(player);
  W.player = player;
  W.playerLegs = legs;

  // Place camera starting position
  W.camCurrentPos.set(0, CAM_HEIGHT, CAM_BEHIND);
}

// ─────────────────────────────────────────────────────────
// 10. VILLAGE SPAWNER — fence only on builder plots  ← BUG FIX
// ─────────────────────────────────────────────────────────

/**
 * FIX: Build fence as a local THREE.Group relative to (0,0,0).
 * The group is added as a child of the house group, so it automatically
 * inherits the correct world position and road-facing rotation.
 *
 * In the fence's local space:
 *   +Z = front (door side, toward road)
 *   -Z = back
 *   ±X = sides
 *
 * The entrance gap is always cut in the +Z (front) face.
 */
function buildFenceGroup() {
  const group = new THREE.Group();
  const r = FENCE_PLOT_R;   // half-extent of fence square
  const gap = FENCE_GAP_H;    // half-width of gate entrance
  const ph = FENCE_POST_H;
  const postMat = new THREE.MeshToonMaterial({ color: 0xe8dcbc });
  const railMat = new THREE.MeshToonMaterial({ color: FENCE_COLOR });
  const gateMat = new THREE.MeshToonMaterial({ color: 0xcfc0a0 });

  /**
   * Add a vertical post at local (lx, lz).
   */
  function addPost(lx, lz) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, ph, 0.1), postMat);
    m.position.set(lx, ph / 2, lz);
    m.castShadow = true;
    group.add(m);
  }

  /**
   * Add two horizontal rails between local positions along one axis.
   * axis "X": rail runs along local X, constant local Z = fixedCoord.
   * axis "Z": rail runs along local Z, constant local X = fixedCoord.
   */
  function addRailSeg(axis, fixedCoord, from, to) {
    if (Math.abs(to - from) < 0.01) return;
    const len = Math.abs(to - from);
    const mid = (from + to) / 2;
    [ph * 0.65, ph * 0.32].forEach((yOff) => {
      const geo = new THREE.BoxGeometry(
        axis === "X" ? len : 0.08,
        0.08,
        axis === "X" ? 0.08 : len
      );
      const mesh = new THREE.Mesh(geo, railMat);
      mesh.position.set(
        axis === "X" ? mid : fixedCoord,
        yOff,
        axis === "X" ? fixedCoord : mid
      );
      group.add(mesh);
    });
  }

  /**
   * Build one face of the fence.
   * axis "X": face is parallel to X axis (constant local Z = fixedCoord).
   *           lo/hi are the X extents of the face.
   * axis "Z": face is parallel to Z axis (constant local X = fixedCoord).
   *           lo/hi are the Z extents of the face.
   * hasGap: whether to cut the entrance in the centre of this face.
   */
  function buildFace(axis, fixedCoord, lo, hi, hasGap) {
    const step = r / 3; // post spacing
    if (hasGap) {
      const mid = (lo + hi) / 2;
      const g0 = mid - gap;  // left gate post coord
      const g1 = mid + gap;  // right gate post coord

      // Left segment: lo → g0
      addRailSeg(axis, fixedCoord, lo, g0);
      for (let t = lo; t <= g0 + 0.01; t += step) {
        const tc = Math.min(t, g0);
        axis === "X" ? addPost(tc, fixedCoord) : addPost(fixedCoord, tc);
      }
      // Right segment: g1 → hi
      addRailSeg(axis, fixedCoord, g1, hi);
      for (let t = g1; t <= hi + 0.01; t += step) {
        const tc = Math.min(t, hi);
        axis === "X" ? addPost(tc, fixedCoord) : addPost(fixedCoord, tc);
      }
      // Taller gate posts flanking the gap
      [g0, g1].forEach((gc) => {
        const gp = new THREE.Mesh(new THREE.BoxGeometry(0.14, ph * 1.35, 0.14), gateMat);
        gp.position.set(
          axis === "X" ? gc : fixedCoord,
          ph * 0.675,
          axis === "X" ? fixedCoord : gc
        );
        group.add(gp);
      });
    } else {
      // Full face, no gap
      addRailSeg(axis, fixedCoord, lo, hi);
      for (let t = lo; t <= hi + 0.01; t += step) {
        const tc = Math.min(t, hi);
        axis === "X" ? addPost(tc, fixedCoord) : addPost(fixedCoord, tc);
      }
    }
  }

  // ── Four fence faces in local space ─────────────────────
  // Back  (-Z local): no gap
  buildFace("X", -r, -r, r, false);
  // Front (+Z local): gap here — this is the door side
  buildFace("X", r, -r, r, true);
  // Left  (-X local): no gap
  buildFace("Z", -r, -r, r, false);
  // Right (+X local): no gap
  buildFace("Z", r, -r, r, false);

  return group;
}

function spawnVillage(nodes) {
  const cols = Math.ceil(Math.sqrt(nodes.length));

  nodes.forEach((builder, i) => {
    // Guard: skip empty / invalid builder entries
    if (!builder || !builder.name) return;

    const col = i % cols;
    const row = Math.floor(i / cols);
    const side = row % 2 === 0 ? 1 : -1;
    const x = (col - (cols - 1) / 2) * PLOT_SPACING;
    const z = side * (PLOT_SPACING * 0.6 + row * PLOT_SPACING * 0.48);

    const pos = new THREE.Vector3(x, 0, z);
    const rotY = getRoadFacingRotation(pos);

    const { group, doorWorldPos } = buildHouse(builder, pos, i, rotY);

    // FIX: add fence as a child of the house group.
    // buildFenceGroup() works entirely in local space (+Z = front/door side).
    // The house group already has position = pos and rotation.y = rotY,
    // so the fence automatically inherits the correct world transform.
    const fenceGroup = buildFenceGroup();
    group.add(fenceGroup);

    W.villageGroup.add(group);
    registerHouseAABB(pos, rotY);

    // NPC in front of door
    const fDX = Math.sin(rotY);
    const fDZ = Math.cos(rotY);
    const npcPos = new THREE.Vector3(
      pos.x + fDX * (HOUSE_D / 2 + 2.0),
      0,
      pos.z + fDZ * (HOUSE_D / 2 + 2.0)
    );
    const npc = buildNPC(i);
    npc.position.copy(npcPos);
    npc.rotation.y = rotY + Math.PI;
    W.villageGroup.add(npc);

    const deskData = {
      githubUrl: `https://github.com/${builder.github || builder.handle}`,
      siteUrl: builder.site || `https://github.com/${builder.github || builder.handle}`,
      builderName: builder.name,
    };

    W.plots.push({
      builder, houseGroup: group,
      housePos: pos.clone(), houseRotY: rotY,
      doorWorldPos, npc, npcPos: npcPos.clone(),
      deskData, index: i,
    });
  });
}

// ─────────────────────────────────────────────────────────
// 11. CHARACTER MOVEMENT & TRAILING CAMERA (v4)
// ─────────────────────────────────────────────────────────

/**
 * Key listener — basic key state + Enter/E actions.
 */
function initControls() {
  W.boundOnKey = (e) => {
    if (e.type === "keydown") W.keys.add(e.code);
    if (e.type === "keyup") W.keys.delete(e.code);

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter"].includes(e.code)) {
      e.preventDefault();
    }

    if (e.type === "keydown") {
      if (e.code === "Enter") handleEnterKey();
      if (e.code === "KeyE" && W.activeDeskData) window.open(W.activeDeskData.siteUrl, "_blank", "noreferrer");
    }
  };
  window.addEventListener("keydown", W.boundOnKey);
  window.addEventListener("keyup", W.boundOnKey);
}

/**
 * Pointer listeners for "hold to run + steer" mechanic.
 * pointerdown → run; pointermove → steer; pointerup → stop.
 */
function initPointerDrive(canvas) {
  W.boundPtrDown = (e) => {
    // Ignore right-click; ignore clicks on UI overlays
    if (e.button !== 0) return;
    W.pointerDown = true;
    W.pointerLastX = e.clientX;
    e.preventDefault();
  };
  W.boundPtrMove = (e) => {
    if (!W.pointerDown) return;
    const dx = e.clientX - W.pointerLastX;
    W.pointerLastX = e.clientX;
    // BUG FIX: invert sign — dragging left (negative dx) increases yaw (turns left).
    W.targetYaw -= dx * MOUSE_STEER;
  };
  W.boundPtrUp = () => { W.pointerDown = false; };

  W.boundTouchStart = (e) => {
    if (e.touches.length === 1) {
      W.pointerDown = true;
      W.pointerLastX = e.touches[0].clientX;
    }
  };
  W.boundTouchMove = (e) => {
    if (!W.pointerDown || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - W.pointerLastX;
    W.pointerLastX = e.touches[0].clientX;
    // BUG FIX: invert sign — same convention as mouse pointer above.
    W.targetYaw -= dx * MOUSE_STEER;
  };
  W.boundTouchEnd = () => { W.pointerDown = false; };

  canvas.addEventListener("pointerdown", W.boundPtrDown);
  window.addEventListener("pointermove", W.boundPtrMove);
  window.addEventListener("pointerup", W.boundPtrUp);
  canvas.addEventListener("touchstart", W.boundTouchStart, { passive: true });
  window.addEventListener("touchmove", W.boundTouchMove, { passive: true });
  window.addEventListener("touchend", W.boundTouchEnd);

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
}

// Scratch vectors — allocated once
const _testPos = new THREE.Vector3();
const _collBox = new THREE.Box3();

/**
 * Character-driven movement & trailing camera.
 *
 * Movement model:
 *  - playerYaw = current facing direction (radians).
 *  - W key / pointer hold  → run forward along playerYaw.
 *  - A key  → steer left   (targetYaw decrements).
 *  - D key  → steer right  (targetYaw increments).
 *  - S key  → turn 180° and run backward.
 *  - Pointer hold + drag L/R  → steer while running.
 *
 * Camera model:
 *  - Ideal camera sits at: player + (0, CAM_HEIGHT, 0)
 *    + CAM_BEHIND units in the -forward direction of the player.
 *  - camCurrentPos lerps toward idealPos each frame → organic trailing.
 */
function updateCharacter(delta) {
  const elapsed = W.clock.getElapsedTime();
  const keys = W.keys;

  // ── 1. Steering ──────────────────────────────────────────
  // FIX: In Three.js, +rotation.y = CCW = Left.
  // A = turn left  → ADD to yaw.   D = turn right → SUBTRACT from yaw.
  if (keys.has("KeyA") || keys.has("ArrowLeft")) W.targetYaw += STEER_SPEED * delta;
  if (keys.has("KeyD") || keys.has("ArrowRight")) W.targetYaw -= STEER_SPEED * delta;

  // Smooth yaw interpolation
  W.playerYaw += (W.targetYaw - W.playerYaw) * Math.min(STEER_LERP / delta, 1);

  // ── 2. Determine if running ──────────────────────────────
  const runW = keys.has("KeyW") || keys.has("ArrowUp");
  const runS = keys.has("KeyS") || keys.has("ArrowDown");
  const ptrRun = W.pointerDown;
  const isMoving = runW || runS || ptrRun;

  // FIX: S key — flip targetYaw ONCE on the rising edge (first frame pressed),
  // then simply move forward in the updated direction.
  // This avoids the feedback-loop jitter that occurs when setting
  // targetYaw = playerYaw + PI every frame while playerYaw is still lerping.
  const sDown = runS && !runW;
  if (sDown && !W.sKeyWasDown) {
    // Rising edge: add PI to target (not re-compute from playerYaw every frame)
    W.targetYaw += Math.PI;
  }
  W.sKeyWasDown = sDown;

  if (isMoving) {
    // Always run forward along current playerYaw.
    // S-key already flipped targetYaw 180° on its rising edge,
    // so after the lerp settles the player naturally faces the other way.
    // While turning, playerYaw is mid-lerp — we still run in that direction.
    const fwdX = Math.sin(W.playerYaw);
    const fwdZ = Math.cos(W.playerYaw);

    const colliders = W.mode === "interior" ? W.interiorColliders : W.exteriorColliders;

    // Try X
    _testPos.set(W.playerPos.x + fwdX * MOVE_SPEED * delta, 0.9, W.playerPos.z);
    if (!isColliding(_testPos, colliders)) W.playerPos.x += fwdX * MOVE_SPEED * delta;

    // Try Z
    _testPos.set(W.playerPos.x, 0.9, W.playerPos.z + fwdZ * MOVE_SPEED * delta);
    if (!isColliding(_testPos, colliders)) W.playerPos.z += fwdZ * MOVE_SPEED * delta;

    // Leg walk animation
    const swing = Math.sin(elapsed * 10) * 0.32;
    W.playerLegs[0].rotation.x = swing;
    W.playerLegs[1].rotation.x = -swing;
  } else {
    W.playerLegs[0].rotation.x *= 0.8;
    W.playerLegs[1].rotation.x *= 0.8;
  }

  // ── 3. Apply position and rotation to mesh ───────────────
  W.player.position.set(W.playerPos.x, 0, W.playerPos.z);
  W.player.rotation.y = W.playerYaw;

  // ── 4. Trailing camera ───────────────────────────────────
  updateTrailingCamera();
}

/**
 * Computes ideal camera position behind the player and lerps toward it.
 *
 * BUG FIX: When inside the 8×8 interior room the standard CAM_BEHIND (9 units)
 * would push the camera backward through the south wall on every frame,
 * overwriting the hardcoded interior spawn position.
 * Solution: use a dynamic follow distance and height that tighten to a tight
 * over-the-shoulder view while isInside, and restore exterior defaults outside.
 */
function updateTrailingCamera() {
  // Dynamic follow parameters based on interior state
  const isInside = W.mode === "interior";
  const targetBehind = isInside ? 1.5 : CAM_BEHIND;
  const targetHeight = isInside ? 1.2 : CAM_HEIGHT;

  // Lerp the effective distance/height toward target (smooth transition on enter/exit)
  if (updateTrailingCamera._behind === undefined) {
    updateTrailingCamera._behind = CAM_BEHIND;
    updateTrailingCamera._height = CAM_HEIGHT;
  }
  const distLerp = isInside ? 0.12 : 0.06; // snap in quickly, ease back out
  updateTrailingCamera._behind += (targetBehind - updateTrailingCamera._behind) * distLerp;
  updateTrailingCamera._height += (targetHeight - updateTrailingCamera._height) * distLerp;

  const effectiveBehind = updateTrailingCamera._behind;
  const effectiveHeight = updateTrailingCamera._height;

  // Ideal position: behind the player in the direction they face
  // "behind" = opposite of forward = -sin/cos(yaw)
  const behindX = -Math.sin(W.playerYaw) * effectiveBehind;
  const behindZ = -Math.cos(W.playerYaw) * effectiveBehind;

  const idealX = W.playerPos.x + behindX;
  const idealY = W.playerPos.y + effectiveHeight;
  const idealZ = W.playerPos.z + behindZ;

  // Lerp current cam pos toward ideal
  W.camCurrentPos.x += (idealX - W.camCurrentPos.x) * CAM_LERP;
  W.camCurrentPos.y += (idealY - W.camCurrentPos.y) * CAM_LERP * 1.4; // Y catches up faster
  W.camCurrentPos.z += (idealZ - W.camCurrentPos.z) * CAM_LERP;

  W.camera.position.copy(W.camCurrentPos);
  W.camera.lookAt(
    W.playerPos.x,
    W.playerPos.y + CAM_LOOK_OFFSET,
    W.playerPos.z
  );
}

function isColliding(pos, colliders) {
  for (let i = 0; i < colliders.length; i++) {
    _collBox.copy(colliders[i]).expandByScalar(PLAYER_RADIUS);
    if (
      pos.x >= _collBox.min.x && pos.x <= _collBox.max.x &&
      pos.z >= _collBox.min.z && pos.z <= _collBox.max.z
    ) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────
// DOOR TRANSITIONS
// ─────────────────────────────────────────────────────────

function handleEnterKey() {
  if (W.mode === "exterior") {
    let bestDist = Infinity, bestPlot = null;
    W.plots.forEach((plot) => {
      const d = W.playerPos.distanceTo(plot.doorWorldPos);
      if (d < bestDist) { bestDist = d; bestPlot = plot; }
    });
    if (bestPlot && bestDist < DOOR_ENTER_RADIUS) enterInterior(bestPlot);
  } else {
    const d = W.playerPos.distanceTo(W.interiorDoorPos);
    if (d < DOOR_EXIT_RADIUS) exitInterior();
  }
}

function enterInterior(plot) {
  W.savedExteriorPos = W.playerPos.clone();
  W.activeInteriorBuilder = plot.builder;
  W.activeDeskData = plot.deskData;

  showInteriorPanel(plot.builder);

  // Teleport player just inside the door (south side of room, facing north)
  // Cell: 8×8 room centred at (500, 0, 0).  South wall at Z=+4, north wall at Z=-4.
  // Spawn just inside the south door: Z = +2.2
  const spawnX = CELL_ORIGIN.x;        // 500
  const spawnZ = CELL_ORIGIN.z + 2.2;  // slightly inside south door
  W.playerPos.set(spawnX, 0, spawnZ);
  W.player.position.set(spawnX, 0, spawnZ);

  // Face player north (into the room = -Z direction → yaw = Math.PI)
  W.playerYaw = Math.PI;
  W.targetYaw = Math.PI;
  W.player.rotation.y = Math.PI;

  // ── CAMERA: hardcoded spawn INSIDE the room, near the south door.
  //    (500, 1.5, 3.5) is inside the room, looking north toward the desk.
  //    FIX: set both camCurrentPos AND camera.position so there is zero
  //    lerp lag — the snap is instantaneous on this frame.
  W.camCurrentPos.set(500, 1.5, 3.5);
  W.camera.position.copy(W.camCurrentPos);
  W.camera.lookAt(500, 1.0, 0);  // look north toward desk

  // ── SCENE: disable exterior sky / fog
  W.scene.background = new THREE.Color(0x1a1005); // warm dark interior
  W.scene.fog = null;

  W.villageGroup.visible = false;
  W.interiorGroup.visible = true;
  W.mode = "interior";

  hideEnterPrompt();
}

function exitInterior() {
  W.playerPos.copy(W.savedExteriorPos || new THREE.Vector3(0, 0, 5));
  W.player.position.set(W.playerPos.x, 0, W.playerPos.z);

  // Restore sky / fog  ← BUG FIX
  W.scene.background = new THREE.Color(SKY_COLOR);
  W.scene.fog = new THREE.Fog(SKY_COLOR, FOG_NEAR, FOG_FAR);

  W.villageGroup.visible = true;
  W.interiorGroup.visible = false;
  W.mode = "exterior";
  W.activeInteriorBuilder = null;
  W.activeDeskData = null;

  hideEnterPrompt();
  hideDeskPrompt();
  hideInteriorPanel();
}

// ─────────────────────────────────────────────────────────
// 12. PROXIMITY & INTERACTION CHECKS
// ─────────────────────────────────────────────────────────

const _projected = new THREE.Vector3();

function proximityCheck() {
  if (W.mode === "exterior") proximityExterior();
  else proximityInterior();
}

function proximityExterior() {
  let closestNPCDist = Infinity, closestNPCIdx = -1;
  let closestDoorDist = Infinity, closestDoorPlot = null;

  W.plots.forEach((plot, i) => {
    const nd = W.playerPos.distanceTo(plot.npcPos);
    if (nd < closestNPCDist) { closestNPCDist = nd; closestNPCIdx = i; }
    const dd = W.playerPos.distanceTo(plot.doorWorldPos);
    if (dd < closestDoorDist) { closestDoorDist = dd; closestDoorPlot = plot; }
  });

  if (closestNPCDist < NAMETAG_RADIUS && closestNPCIdx >= 0) {
    showNametag(W.plots[closestNPCIdx].builder, W.plots[closestNPCIdx].npcPos);
  } else {
    hideNametag();
  }

  if (closestDoorDist < DOOR_ENTER_RADIUS && closestDoorPlot) {
    showEnterPrompt(closestDoorPlot.builder, false);
  } else {
    hideEnterPrompt();
  }

  hideDeskPrompt();
}

function proximityInterior() {
  hideNametag();

  const exitDist = W.playerPos.distanceTo(W.interiorDoorPos);
  if (exitDist < DOOR_EXIT_RADIUS) showEnterPrompt(null, true);
  else hideEnterPrompt();

  const deskDist = W.interiorDeskPos
    ? W.playerPos.distanceTo(W.interiorDeskPos) : Infinity;
  if (deskDist < DESK_INTERACT_RADIUS && W.activeDeskData) showDeskPrompt(W.activeDeskData);
  else hideDeskPrompt();
}

// ── UI helpers ──────────────────────────────────────────

function showNametag(builder, worldPos) {
  if (!W.nametag) return;
  _projected.copy(worldPos);
  _projected.y += 2.6;
  _projected.project(W.camera);
  const x = ((_projected.x + 1) / 2) * W.renderer.domElement.clientWidth;
  const y = ((-_projected.y + 1) / 2) * W.renderer.domElement.clientHeight;
  W.nametag.style.left = `${x}px`;
  W.nametag.style.top = `${y}px`;
  W.nametag.querySelector(".nametag-name").textContent = builder.name;
  W.nametag.querySelector(".nametag-handle").textContent = `@${builder.github || builder.handle}`;
  W.nametag.classList.add("visible");
}

function hideNametag() { W.nametag?.classList.remove("visible"); }

function showEnterPrompt(builder, isExit) {
  if (!W.enterPromptEl) return;
  W.enterPromptEl.querySelector(".enter-prompt-action").textContent =
    isExit ? "EXIT HOUSE" : "ENTER HOUSE";
  W.enterPromptEl.querySelector(".enter-prompt-name").textContent =
    isExit ? "" : (builder?.name ?? "");
  W.enterPromptEl.classList.add("visible");
}

function hideEnterPrompt() { W.enterPromptEl?.classList.remove("visible"); }

function showDeskPrompt(deskData) {
  if (!W.deskPromptEl) return;
  const n = W.deskPromptEl.querySelector(".desk-prompt-name");
  if (n) n.textContent = deskData.builderName ?? "";
  W.deskPromptEl.classList.add("visible");
}

function hideDeskPrompt() { W.deskPromptEl?.classList.remove("visible"); }

// ─────────────────────────────────────────────────────────
// 13. INTERIOR STATS PANEL
// ─────────────────────────────────────────────────────────

function showInteriorPanel(builder) {
  if (!W.interiorPanel) return;
  const stats = builder.stats || {};
  const projects = builder.projects || [];

  W.interiorPanel.innerHTML = `
    <div class="interior-eyebrow">BUILDER / PROFILE</div>
    <h3 class="interior-name">${builder.name}</h3>
    <span class="interior-handle">@${builder.github || builder.handle}</span>
    ${builder.bio ? `<p class="interior-bio">${builder.bio}</p>` : ""}
    <div class="interior-divider"></div>
    <div class="interior-stats-grid">
      <div class="interior-stat">
        <span class="interior-stat-val">${stats.contributions ?? "—"}</span>
        <span class="interior-stat-label">CONTRIBUTIONS</span>
      </div>
      <div class="interior-stat">
        <span class="interior-stat-val streak">${stats.streak ?? "—"}d</span>
        <span class="interior-stat-label">STREAK</span>
      </div>
      <div class="interior-stat">
        <span class="interior-stat-val prs">${stats.mergedPRs ?? "—"}</span>
        <span class="interior-stat-label">MERGED PRs</span>
      </div>
      <div class="interior-stat">
        <span class="interior-stat-val">${stats.monthly ?? "—"}</span>
        <span class="interior-stat-label">MONTHLY</span>
      </div>
    </div>
    ${projects.length > 0 ? `
      <div class="interior-divider"></div>
      <div class="interior-projects-header">SHIPPED PROJECTS</div>
      ${projects.slice(0, 4).map((p) => `
        <a class="interior-project-item" href="${p.url}" target="_blank" rel="noreferrer">
          <div class="interior-project-dot"></div>
          <div>
            <span class="interior-project-name">${p.name}</span>
            <span class="interior-project-desc">${(p.description ?? "").slice(0, 80)}${(p.description?.length ?? 0) > 80 ? "…" : ""}</span>
          </div>
        </a>
      `).join("")}
    ` : ""}
    <div class="interior-hint">
      Walk to desk · press [E] to open site ↗<br>
      <small style="opacity:0.5">At exit door: [ENTER] to leave</small>
    </div>
  `;

  W.interiorPanel.classList.add("visible");
}

function hideInteriorPanel() { W.interiorPanel?.classList.remove("visible"); }

// ─────────────────────────────────────────────────────────
// 14. ANIMATION LOOP
// ─────────────────────────────────────────────────────────

function animate() {
  W.rafId = requestAnimationFrame(animate);
  const delta = Math.min(W.clock.getDelta(), 0.05);
  const elapsed = W.clock.getElapsedTime();

  updateCharacter(delta);

  // NPC idle (exterior only)
  if (W.mode === "exterior") {
    W.plots.forEach((plot, i) => {
      const head = plot.npc.userData.head;
      if (head) head.position.y = 1.62 + Math.sin(elapsed * 1.8 + i) * 0.04;
      plot.npc.rotation.y = plot.houseRotY + Math.PI + Math.sin(elapsed * 0.6 + i * 1.3) * 0.15;
    });
  }

  proximityCheck();
  W.renderer.render(W.scene, W.camera);
}

// ─────────────────────────────────────────────────────────
// 15. PUBLIC API — initWorld / destroyWorld
// ─────────────────────────────────────────────────────────

export async function initWorld(canvas) {
  W.nametag = document.getElementById("worldNametag");
  W.interiorPanel = document.getElementById("interiorPanel");
  W.loader = document.getElementById("worldLoader");
  W.enterPromptEl = document.getElementById("enterPrompt");
  W.deskPromptEl = document.getElementById("deskPrompt");

  initScene(canvas);
  initLighting();
  buildGround();
  buildInteriorCell();
  buildPlayer();
  initControls();
  initPointerDrive(canvas);

  W.boundOnResize = () => {
    W.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    W.camera.updateProjectionMatrix();
    W.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  };
  window.addEventListener("resize", W.boundOnResize);

  let nodes = [];
  try {
    const res = await fetch("./data/network.json");
    const data = await res.json();
    nodes = data.nodes || [];
  } catch (err) {
    console.warn("[world.js] Using demo data —", err.message);
    nodes = [
      {
        name: "Abid TS", handle: "abid0853", github: "abid0853",
        site: "https://abidts.work",
        bio: "Founder at AyraSoft. Full-stack, PWAs, applied AI.",
        stats: { contributions: 1, streak: 1, mergedPRs: 0, monthly: 1 },
        projects: [
          { name: "KeralaVipani", url: "https://keralavipani.vercel.app", description: "Crowdsourced Kerala commodity market PWA." },
          { name: "DentOS", url: "https://ayrasoft.vercel.app/dentos.html", description: "Dental practice management." },
        ],
      },
      {
        name: "Demo Builder", handle: "demo", github: "github",
        site: "https://github.com",
        bio: "A placeholder builder.",
        stats: { contributions: 10, streak: 3, mergedPRs: 2, monthly: 5 },
        projects: [{ name: "Demo Project", url: "https://github.com", description: "A sample project." }],
      },
    ];
  }

  spawnVillage(nodes);

  W.loader?.classList.add("hidden");
  W.clock.start();
  animate();

  canvas.setAttribute("tabindex", "0");
  canvas.focus({ preventScroll: true });
}

export function destroyWorld() {
  cancelAnimationFrame(W.rafId);
  W.rafId = null;

  if (W.boundOnKey) {
    window.removeEventListener("keydown", W.boundOnKey);
    window.removeEventListener("keyup", W.boundOnKey);
    W.boundOnKey = null;
  }
  if (W.boundOnResize) {
    window.removeEventListener("resize", W.boundOnResize);
    W.boundOnResize = null;
  }

  const canvas = W.renderer?.domElement;
  if (canvas) {
    if (W.boundPtrDown) canvas.removeEventListener("pointerdown", W.boundPtrDown);
    if (W.boundTouchStart) canvas.removeEventListener("touchstart", W.boundTouchStart);
  }
  if (W.boundPtrMove) window.removeEventListener("pointermove", W.boundPtrMove);
  if (W.boundPtrUp) window.removeEventListener("pointerup", W.boundPtrUp);
  if (W.boundTouchMove) window.removeEventListener("touchmove", W.boundTouchMove);
  if (W.boundTouchEnd) window.removeEventListener("touchend", W.boundTouchEnd);

  W.boundPtrDown = W.boundPtrMove = W.boundPtrUp = null;
  W.boundTouchStart = W.boundTouchMove = W.boundTouchEnd = null;

  if (W.scene) {
    W.scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        (Array.isArray(obj.material) ? obj.material : [obj.material])
          .forEach((m) => m?.dispose());
      }
    });
    W.scene.clear();
  }

  W.renderer?.dispose();

  // Reset state
  W.renderer = W.scene = W.camera = W.clock = W.player = null;
  W.villageGroup = W.interiorGroup = null;
  W.plots = [];
  W.exteriorColliders = [];
  W.interiorColliders = [];
  W.playerLegs = [];
  W.keys.clear();
  W.mode = "exterior";
  W.activeInteriorBuilder = null;
  W.activeDeskData = null;
  W.savedExteriorPos = null;
  W.playerYaw = 0;
  W.targetYaw = 0;
  W.pointerDown = false;
  W.playerPos.set(0, 0, 0);
  W.camCurrentPos.set(0, CAM_HEIGHT, CAM_BEHIND);

  hideNametag();
  hideInteriorPanel();
  hideEnterPrompt();
  hideDeskPrompt();
  W.loader?.classList.remove("hidden");
}
