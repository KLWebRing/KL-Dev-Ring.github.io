// ── KL DevVerse — Character System (TypeScript Port) ─────────────────
// Port of character.js createCharacter() and animateCharacter() to TypeScript.
// The visual logic is PRESERVED EXACTLY — only type safety is added.
// Wraps into R3F via the CharacterMesh component.

import {
  Group,
  SphereGeometry,
  CylinderGeometry,
  BoxGeometry,
  ConeGeometry,
  Mesh,
  MeshToonMaterial,
  MeshBasicMaterial,
  BackSide,
} from 'three';
import { seeded, pickColor } from '@/shared/math';
import { COLORS } from '@/shared/constants';
import type { AnimationState } from '@/shared/types';

// Local re-implementation of createToonMesh to avoid circular deps
function toonMesh(geo: ConstructorParameters<typeof Mesh>[0], mat: ConstructorParameters<typeof Mesh>[1], thickness = 0.04) {
  const mesh = new Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (thickness > 0) {
    const outline = new Mesh(geo, new MeshBasicMaterial({ color: 0x2c2d30, side: BackSide }));
    outline.scale.setScalar(1 + thickness);
    mesh.add(outline);
  }
  return mesh;
}

export interface CharacterOptions {
  handle: string;
  tags?: readonly string[];
  hairColor?: string;
  shirtColor?: string;
  skinColor?: string;
  scale?: number;
}

export function createCharacter(options: CharacterOptions): Group {
  const group = new Group();
  group.name = 'character';

  const tags = options.tags ?? [];
  const seedHair = seeded(options.handle, 42);
  const seedCoat = seeded(options.handle, 101);
  const seedSkin = seeded(options.handle, 202);

  const hairColor = options.hairColor ?? pickColor(seedHair, COLORS.HAIR_DARKS);
  const coatColor = options.shirtColor ?? pickColor(seedCoat, COLORS.COAT_REDS);
  const skinColor = options.skinColor ?? pickColor(seedSkin, COLORS.SKIN_TONES);

  const matSkin  = new MeshToonMaterial({ color: skinColor });
  const matCoat  = new MeshToonMaterial({ color: coatColor });
  const matPants = new MeshToonMaterial({ color: 0x18181b });
  const matHair  = new MeshToonMaterial({ color: hairColor });
  const matBlack = new MeshToonMaterial({ color: 0x18181b });
  const matWhite = new MeshToonMaterial({ color: 0xffffff });
  const matTeal  = new MeshToonMaterial({ color: COLORS.TEAL });

  const bodyGroup = new Group();
  bodyGroup.name = 'bodyGroup';
  group.add(bodyGroup);

  // Pelvis
  const pelvis = toonMesh(new CylinderGeometry(0.18, 0.18, 0.12, 12), matPants);
  pelvis.name = 'pelvis';
  pelvis.position.y = 0.32;
  bodyGroup.add(pelvis);

  const skirt = toonMesh(new CylinderGeometry(0.185, 0.20, 0.16, 12), matPants, 0.03);
  skirt.position.y = 0.22;
  bodyGroup.add(skirt);

  // Torso
  const torso = toonMesh(new CylinderGeometry(0.18, 0.18, 0.44, 12), matCoat);
  torso.name = 'torso';
  torso.position.y = 0.58;
  bodyGroup.add(torso);

  // Lapels
  const lapelL = toonMesh(new BoxGeometry(0.06, 0.12, 0.03), matWhite, 0.02);
  lapelL.position.set(-0.06, 0.18, 0.1); lapelL.rotation.set(0.1, 0.1, -0.4);
  torso.add(lapelL);
  const lapelR = toonMesh(new BoxGeometry(0.06, 0.12, 0.03), matWhite, 0.02);
  lapelR.position.set(0.06, 0.18, 0.1); lapelR.rotation.set(0.1, -0.1, 0.4);
  torso.add(lapelR);

  // Center seam + buttons
  const seam = toonMesh(new BoxGeometry(0.015, 0.44, 0.01), matBlack, 0);
  seam.position.set(0, 0, 0.095);
  torso.add(seam);
  for (let b = 0; b < 3; b++) {
    const btn = toonMesh(new SphereGeometry(0.016, 4, 4), matWhite, 0);
    btn.position.set(0, 0.1 - b * 0.12, 0.105);
    torso.add(btn);
  }

  // Crossbody bag
  const strapF = toonMesh(new BoxGeometry(0.025, 0.58, 0.015), matBlack, 0);
  strapF.position.set(0, 0, 0.1); strapF.rotation.z = -0.66;
  torso.add(strapF);
  const bag = toonMesh(new BoxGeometry(0.16, 0.12, 0.06), matBlack, 0.02);
  bag.position.set(0.18, -0.18, 0.06); bag.rotation.set(0.2, -0.2, -0.3);
  torso.add(bag);

  // Neck
  const neck = toonMesh(new CylinderGeometry(0.05, 0.05, 0.1, 8), matSkin);
  neck.position.y = 0.84;
  bodyGroup.add(neck);

  // Head
  const headGroup = new Group();
  headGroup.name = 'head';
  headGroup.position.y = 0.89;
  bodyGroup.add(headGroup);

  const headMesh = toonMesh(new SphereGeometry(0.2, 16, 16), matSkin);
  headMesh.position.y = 0.2;
  headGroup.add(headMesh);

  // Face mask
  const mask = toonMesh(new BoxGeometry(0.15, 0.07, 0.05), matWhite, 0.02);
  mask.position.set(0, 0.13, 0.185); mask.rotation.x = 0.1;
  headGroup.add(mask);

  // Eyes & brows
  const eyeL = toonMesh(new BoxGeometry(0.045, 0.015, 0.01), matBlack, 0);
  eyeL.position.set(-0.07, 0.23, 0.188); eyeL.rotation.set(0.05, 0.35, 0.05);
  const eyeR = toonMesh(new BoxGeometry(0.045, 0.015, 0.01), matBlack, 0);
  eyeR.position.set(0.07, 0.23, 0.188); eyeR.rotation.set(0.05, -0.35, -0.05);
  headGroup.add(eyeL, eyeR);

  // Hair
  const hairGroup = new Group();
  hairGroup.name = 'hair';
  headGroup.add(hairGroup);
  const hairCap = toonMesh(new SphereGeometry(0.21, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), matHair);
  hairCap.position.y = 0.2; hairCap.scale.set(1.04, 1.02, 1.04);
  hairGroup.add(hairCap);
  const bangsC = toonMesh(new BoxGeometry(0.12, 0.09, 0.08), matHair, 0.03);
  bangsC.position.set(0, 0.32, 0.15); bangsC.rotation.x = -0.2;
  hairGroup.add(bangsC);
  const backDrape = toonMesh(new BoxGeometry(0.38, 0.18, 0.12), matHair, 0.03);
  backDrape.position.set(0, 0.09, -0.14); backDrape.rotation.x = 0.1;
  hairGroup.add(backDrape);

  // Straw hat (player always, NPCs sometimes)
  const isPlayer = options.handle === 'player';
  if (isPlayer || seeded(options.handle, 77) > 0.82) {
    const hatGroup = new Group();
    hatGroup.name = 'strawHat';
    hatGroup.position.set(0, 0.41, 0.01); hatGroup.rotation.x = 0.05;
    const matHatY = new MeshToonMaterial({ color: 0xeab308 });
    const matHatR = new MeshToonMaterial({ color: 0xdc2626 });
    hatGroup.add(toonMesh(new CylinderGeometry(0.35, 0.35, 0.02, 12), matHatY, 0.02));
    const crown = toonMesh(new SphereGeometry(0.16, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), matHatY, 0.02);
    crown.position.y = 0.01;
    hatGroup.add(crown);
    const band = toonMesh(new CylinderGeometry(0.162, 0.162, 0.04, 12), matHatR, 0.02);
    band.position.y = 0.02;
    hatGroup.add(band);
    headGroup.add(hatGroup);
  }

  // ── Arms ──────────────────────────────────────────────────────────
  const buildArm = (side: -1 | 1) => {
    const pivot = new Group();
    pivot.name = side < 0 ? 'pivotLArm' : 'pivotRArm';
    pivot.position.set(side * 0.21, 0.72, 0);
    pivot.add(toonMesh(new SphereGeometry(0.075, 8, 8), matCoat));

    const upper = toonMesh(new CylinderGeometry(0.07, 0.065, 0.24, 8), matCoat);
    upper.name = 'upperArm'; upper.position.y = -0.12;
    pivot.add(upper);

    const elbowPivot = new Group();
    elbowPivot.name = side < 0 ? 'pivotLElbow' : 'pivotRElbow';
    elbowPivot.position.set(0, -0.24, 0);
    upper.add(elbowPivot);
    elbowPivot.add(toonMesh(new SphereGeometry(0.065, 8, 8), matCoat));

    const forearm = toonMesh(new CylinderGeometry(0.065, 0.06, 0.22, 8), matSkin);
    forearm.name = 'foreArm'; forearm.position.y = -0.11;
    elbowPivot.add(forearm);
    const hand = toonMesh(new SphereGeometry(0.07, 8, 8), matSkin);
    hand.position.y = -0.22;
    forearm.add(hand);

    bodyGroup.add(pivot);
    return pivot;
  };

  buildArm(-1);
  buildArm(1);

  // ── Legs ──────────────────────────────────────────────────────────
  const buildLeg = (side: -1 | 1) => {
    const pivot = new Group();
    pivot.name = side < 0 ? 'pivotLLeg' : 'pivotRLeg';
    pivot.position.set(side * 0.11, 0.28, 0);
    pivot.add(toonMesh(new SphereGeometry(0.085, 8, 8), matPants));

    const upper = toonMesh(new CylinderGeometry(0.085, 0.08, 0.22, 8), matPants);
    upper.name = 'upperLeg'; upper.position.y = -0.11;
    pivot.add(upper);

    const kneePivot = new Group();
    kneePivot.name = side < 0 ? 'pivotLKnee' : 'pivotRKnee';
    kneePivot.position.set(0, -0.22, 0);
    upper.add(kneePivot);
    kneePivot.add(toonMesh(new SphereGeometry(0.08, 8, 8), matPants));

    const calf = toonMesh(new CylinderGeometry(0.08, 0.075, 0.2, 8), matSkin);
    calf.name = 'calf'; calf.position.y = -0.1;
    kneePivot.add(calf);

    // Sock
    const sock = toonMesh(new CylinderGeometry(0.082, 0.082, 0.08, 8), matWhite, 0.02);
    sock.position.y = -0.12;
    calf.add(sock);

    // Sneaker
    const shoeGroup = new Group();
    shoeGroup.position.set(0, -0.2, 0.02);
    const shoePlatform = toonMesh(new BoxGeometry(0.14, 0.035, 0.22), matTeal, 0.01);
    shoePlatform.position.y = 0;
    shoeGroup.add(shoePlatform);
    const sole = toonMesh(new BoxGeometry(0.14, 0.035, 0.22), matTeal, 0.01);
    sole.position.y = -0.035;
    shoeGroup.add(sole);
    const body = toonMesh(new BoxGeometry(0.13, 0.08, 0.21), matWhite, 0.015);
    body.position.y = 0.02;
    shoeGroup.add(body);
    const toeCap = toonMesh(new BoxGeometry(0.125, 0.04, 0.05), matCoat, 0.015);
    toeCap.position.set(0, 0.01, 0.085);
    shoeGroup.add(toeCap);
    calf.add(shoeGroup);

    bodyGroup.add(pivot);
    return pivot;
  };

  buildLeg(-1);
  buildLeg(1);

  // Laptop accessory for dev builders
  if (tags.includes('opensource') || tags.includes('webdev') || tags.includes('systems')) {
    const lapGroup = new Group();
    lapGroup.position.set(0.06, -0.12, 0.06);
    lapGroup.rotation.set(0.2, -0.1, -0.2);
    lapGroup.add(toonMesh(new BoxGeometry(0.16, 0.015, 0.12), matBlack, 0));
    const arm = group.getObjectByName('pivotLArm');
    arm?.getObjectByName('upperArm')?.add(lapGroup);
  }

  group.scale.setScalar(options.scale ?? 0.85);
  return group;
}

// ── Animation ─────────────────────────────────────────────────────────

export function animateCharacter(
  character: Group,
  state: AnimationState,
  time: number,
  speed: number = 1.0,
): void {
  const bodyGroup = character.getObjectByName('bodyGroup') as Group | undefined;
  const head      = character.getObjectByName('head') as Group | undefined;
  const pivotLA   = character.getObjectByName('pivotLArm') as Group | undefined;
  const pivotRA   = character.getObjectByName('pivotRArm') as Group | undefined;
  const pivotLL   = character.getObjectByName('pivotLLeg') as Group | undefined;
  const pivotRL   = character.getObjectByName('pivotRLeg') as Group | undefined;
  const pivotLE   = character.getObjectByName('pivotLElbow') as Group | undefined;
  const pivotRE   = character.getObjectByName('pivotRElbow') as Group | undefined;
  const pivotLK   = character.getObjectByName('pivotLKnee') as Group | undefined;
  const pivotRK   = character.getObjectByName('pivotRKnee') as Group | undefined;

  if (!bodyGroup || !pivotLA || !pivotRA || !pivotLL || !pivotRL) return;

  const t = time * speed;

  // Defaults
  bodyGroup.position.set(0, 0, 0);
  bodyGroup.rotation.set(0, 0, 0);
  if (head) head.rotation.set(0, 0, 0);
  pivotLA.rotation.set(0, 0, -0.05);
  pivotRA.rotation.set(0, 0, 0.05);
  pivotLL.rotation.set(0, 0, 0);
  pivotRL.rotation.set(0, 0, 0);
  if (pivotLE) pivotLE.rotation.set(0, 0, 0);
  if (pivotRE) pivotRE.rotation.set(0, 0, 0);
  if (pivotLK) pivotLK.rotation.set(0, 0, 0);
  if (pivotRK) pivotRK.rotation.set(0, 0, 0);

  switch (state) {
    case 'idle': {
      bodyGroup.position.y = Math.sin(t * 2) * 0.015;
      pivotLA.rotation.x = Math.sin(t * 2) * 0.03;
      pivotRA.rotation.x = -Math.sin(t * 2) * 0.03;
      if (pivotLE) pivotLE.rotation.x = 0.15;
      if (pivotRE) pivotRE.rotation.x = 0.15;
      break;
    }
    case 'walk': {
      const sw = Math.sin(t * 8);
      pivotLA.rotation.x = sw * 0.45;
      pivotRA.rotation.x = -sw * 0.45;
      pivotLL.rotation.x = -sw * 0.45;
      pivotRL.rotation.x = sw * 0.45;
      pivotLA.rotation.z = -0.08;
      pivotRA.rotation.z = 0.08;
      if (pivotLK) pivotLK.rotation.x = Math.max(0, -sw) * 0.55;
      if (pivotRK) pivotRK.rotation.x = Math.max(0, sw) * 0.55;
      if (pivotLE) pivotLE.rotation.x = 0.3 + Math.sin(t * 8 - Math.PI / 2) * 0.08;
      if (pivotRE) pivotRE.rotation.x = 0.3 - Math.sin(t * 8 - Math.PI / 2) * 0.08;
      bodyGroup.position.y = Math.abs(Math.sin(t * 16)) * 0.04;
      bodyGroup.rotation.x = 0.04;
      break;
    }
    case 'run': {
      const sr = Math.sin(t * 13);
      pivotLA.rotation.x = sr * 0.8;
      pivotRA.rotation.x = -sr * 0.8;
      pivotLL.rotation.x = -sr * 0.7;
      pivotRL.rotation.x = sr * 0.7;
      pivotLA.rotation.z = -0.15;
      pivotRA.rotation.z = 0.15;
      if (pivotLK) pivotLK.rotation.x = Math.max(0, -sr) * 0.95;
      if (pivotRK) pivotRK.rotation.x = Math.max(0, sr) * 0.95;
      if (pivotLE) pivotLE.rotation.x = 0.65 + Math.sin(t * 13) * 0.12;
      if (pivotRE) pivotRE.rotation.x = 0.65 - Math.sin(t * 13) * 0.12;
      bodyGroup.position.y = Math.abs(Math.sin(t * 26)) * 0.08;
      bodyGroup.rotation.x = 0.12;
      break;
    }
    case 'wave': {
      bodyGroup.position.y = Math.sin(t * 2.5) * 0.015;
      pivotLA.rotation.z = -0.05;
      if (pivotLE) pivotLE.rotation.x = 0.15;
      pivotRA.rotation.x = 0.1;
      pivotRA.rotation.z = 1.4;
      if (pivotRE) {
        pivotRE.rotation.x = 0.5;
        pivotRE.rotation.z = Math.sin(t * 14) * 0.35;
      }
      break;
    }
    case 'celebrate': {
      const jump = Math.max(0, Math.sin(t * 11)) * 0.25;
      bodyGroup.position.y = jump;
      pivotLA.rotation.z = -1.9 + Math.sin(t * 14) * 0.1;
      pivotRA.rotation.z = 1.9 + Math.sin(t * 14) * 0.1;
      if (pivotLE) pivotLE.rotation.x = 0.4;
      if (pivotRE) pivotRE.rotation.x = 0.4;
      if (jump > 0.05) {
        if (pivotLK) pivotLK.rotation.x = 0.4;
        if (pivotRK) pivotRK.rotation.x = 0.4;
      }
      break;
    }
    case 'sit': {
      bodyGroup.position.y = -0.36;
      bodyGroup.position.z = -0.15;
      pivotLA.rotation.x = -Math.PI / 6;
      pivotRA.rotation.x = -Math.PI / 6;
      if (pivotLE) pivotLE.rotation.x = 0.4;
      if (pivotRE) pivotRE.rotation.x = 0.4;
      pivotLL.rotation.x = -Math.PI / 2;
      pivotRL.rotation.x = -Math.PI / 2;
      if (pivotLK) pivotLK.rotation.x = Math.PI / 2;
      if (pivotRK) pivotRK.rotation.x = Math.PI / 2;
      break;
    }
    case 'jump': {
      bodyGroup.position.y = 0.04;
      pivotLA.rotation.x = -0.4;
      pivotRA.rotation.x = -0.4;
      pivotLA.rotation.z = -0.3;
      pivotRA.rotation.z = 0.3;
      if (pivotLK) pivotLK.rotation.x = 0.5;
      if (pivotRK) pivotRK.rotation.x = 0.5;
      break;
    }
  }
}
