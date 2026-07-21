// ── KL DevVerse — World Scene ────────────────────────────────────────
// Builds the entire 3D world using Three.js objects added to the scene.
// Ported from world.js, decomposed into sub-sections.
// All structure/interactable data is registered into worldStore.

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import {
  Group, Mesh, PlaneGeometry, BoxGeometry, CylinderGeometry,
  SphereGeometry, ConeGeometry, MeshToonMaterial, Vector3,
  Line, BufferGeometry, LineBasicMaterial,
} from 'three';
import { createToonMesh } from '@/graphics/materials/createToonMesh';
import {
  toon,
  createRiverTexture,
  createRoofTexture,
  createCobblestoneTexture,
  createStripedTexture,
} from '@/graphics/materials';
import { COLORS } from '@/shared/constants';
import { useWorldStore } from '@/stores/worldStore';
import { useUIStore } from '@/stores/uiStore';
import type { InteractableItem, Structure } from '@/shared/types';
import { createCharacter, animateCharacter } from '@/entities/character/characterSystem';
import type { AnimationState } from '@/shared/types';

// ── NPC registry for the game loop to animate ────────────────────────
interface NPCEntry {
  mesh: Group;
  type: 'shopkeeper' | 'customer_walk' | 'customer_sit' | 'resident';
  defaultFacing?: number;
  speed?: number;
  direction?: number;
  minZ?: number;
  maxZ?: number;
  animState: AnimationState;
  time: number;
}

// Exported so GameEngine can animate them
export const worldNPCs: NPCEntry[] = [];

// Exported river texture for animation in game loop
export let riverTexture: ReturnType<typeof createRiverTexture> | null = null;

export function WorldScene(): null {
  const { scene } = useThree();
  const { setStructures, setInteractables, members } = useWorldStore();
  const { handleInteraction } = useUIStore();

  useEffect(() => {
    const townGroup = new Group();
    townGroup.name = 'townGroup';
    scene.add(townGroup);

    const structures: Structure[] = [];
    const interactables: InteractableItem[] = [];
    worldNPCs.length = 0;

    const onInteract = (event: Parameters<typeof handleInteraction>[0]) => {
      handleInteraction(event);
    };

    // ── GROUND ──────────────────────────────────────────────────────
    const groundMat = toon(COLORS.GRASS);
    const ground = new Mesh(new PlaneGeometry(300, 300), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    townGroup.add(ground);

    // ── CENTRAL PLAZA ───────────────────────────────────────────────
    const plazaMat = toon(0xc9b07a);
    const plaza = new Mesh(new CylinderGeometry(12, 12, 0.12, 32), plazaMat);
    plaza.position.set(0, 0.06, 0);
    plaza.receiveShadow = true;
    townGroup.add(plaza);

    // Fountain
    const fountainBaseMat = toon(0x94a3b8);
    const fountainBase = createToonMesh(new CylinderGeometry(2.2, 2.4, 0.5, 16), fountainBaseMat, 0.02);
    fountainBase.position.set(0, 0.25, 0);
    townGroup.add(fountainBase);
    const fountainRim = createToonMesh(new CylinderGeometry(2.3, 2.2, 0.15, 16), fountainBaseMat, 0.02);
    fountainRim.position.set(0, 0.5, 0);
    townGroup.add(fountainRim);
    const waterMat = toon(COLORS.RIVER_BLUE, { transparent: true, opacity: 0.7 });
    const fountainWater = new Mesh(new CylinderGeometry(2.0, 2.0, 0.05, 16), waterMat);
    fountainWater.position.set(0, 0.4, 0);
    townGroup.add(fountainWater);
    structures.push({ x: 0, z: 0, radius: 2.5 });

    // ── ROADS ───────────────────────────────────────────────────────
    const roadMat = toon(COLORS.ROAD);
    const roadNS = new Mesh(new PlaneGeometry(5, 280), roadMat);
    roadNS.rotation.x = -Math.PI / 2;
    roadNS.position.set(0, 0.01, 0);
    roadNS.receiveShadow = true;
    townGroup.add(roadNS);

    const roadEW = new Mesh(new PlaneGeometry(280, 5), roadMat);
    roadEW.rotation.x = -Math.PI / 2;
    roadEW.position.set(0, 0.01, 0);
    roadEW.receiveShadow = true;
    townGroup.add(roadEW);

    // ── NOTICE BOARD ─────────────────────────────────────────────────
    const boardPost = createToonMesh(new CylinderGeometry(0.06, 0.06, 1.8, 8), toon(COLORS.WOOD_DARK), 0.02);
    boardPost.position.set(0, 0.9, 8.5);
    const boardFace = createToonMesh(new BoxGeometry(1.2, 0.8, 0.08), toon(0xfef3c7), 0.02);
    boardFace.position.set(0, 1.9, 8.5);
    townGroup.add(boardPost, boardFace);
    structures.push({ x: 0, z: 8.5, radius: 0.8 });
    interactables.push({
      x: 0, z: 8.8, radius: 1.6,
      message: 'Press [E] to read Community Board',
      action: () => onInteract({ type: 'chat' }),
    });

    // ── TOWN HALL ───────────────────────────────────────────────────
    const townHallGroup = new Group();
    townHallGroup.position.set(0, 0, -22);
    const hallBase = createToonMesh(new BoxGeometry(14, 5, 8), toon(COLORS.WALL_WHITE), 0.02);
    hallBase.position.y = 2.5;
    hallBase.castShadow = true;
    townHallGroup.add(hallBase);
    const roofTex = createRoofTexture();
    const hallRoof = createToonMesh(new BoxGeometry(15, 0.3, 9.5), toon(COLORS.ROOF_TERRACOTTA, { map: roofTex }), 0.02);
    hallRoof.position.y = 5.3;
    hallRoof.castShadow = true;
    townHallGroup.add(hallRoof);
    // Columns
    for (let cx = -5; cx <= 5; cx += 5) {
      const col = createToonMesh(new CylinderGeometry(0.22, 0.25, 4.5, 8), toon(0xe5e7eb), 0.02);
      col.position.set(cx, 2.25, 4.1);
      col.castShadow = true;
      townHallGroup.add(col);
    }
    townGroup.add(townHallGroup);
    structures.push({ x: 0, z: -22, radius: 8.5 });

    interactables.push({
      x: 0, z: -13.5, radius: 1.8,
      message: 'Press [E] to read Town Hall Leaderboard',
      action: () => onInteract({ type: 'leaderboard' }),
    });

    // ── BACKWATER RIVER ─────────────────────────────────────────────
    riverTexture = createRiverTexture();
    const riverMat = toon(0x0284c7, { map: riverTexture, transparent: true, opacity: 0.85 });
    const river = new Mesh(new PlaneGeometry(14, 350), riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(45, 0.012, 0);
    river.receiveShadow = true;
    townGroup.add(river);

    // ── WOODEN BRIDGE ───────────────────────────────────────────────
    const matBridge = toon(COLORS.WOOD_DARK);
    const bridgeGroup = new Group();
    bridgeGroup.position.set(45, 0, 0);
    const deck = createToonMesh(new BoxGeometry(14, 0.2, 5.2), matBridge, 0.02);
    deck.position.y = 0.15;
    bridgeGroup.add(deck);
    townGroup.add(bridgeGroup);
    structures.push({ x: 45, z: 0, radius: 3.5 });

    // ── MOUNTAINS ───────────────────────────────────────────────────
    const mountMat = toon(COLORS.MOUNTAIN_GREEN);
    const mountainPositions = [
      { x: -140, z: -100, r: 45, h: 35 },
      { x: -60,  z: -130, r: 55, h: 45 },
      { x: 0,    z: -140, r: 65, h: 50 },
      { x: 70,   z: -130, r: 55, h: 45 },
      { x: 140,  z: -100, r: 45, h: 35 },
    ];
    mountainPositions.forEach(m => {
      const geo = new ConeGeometry(m.r, m.h, 12, 6);
      const pos = geo.attributes['position'];
      if (pos) {
        for (let i = 0; i < pos.count; i++) {
          const vy = pos.getY(i);
          if (vy > -m.h / 2 + 1.0) {
            const vx = pos.getX(i);
            const vz = pos.getZ(i);
            const angle = Math.atan2(vz, vx);
            const noise = Math.sin(vy * 0.4) * Math.cos(angle * 3.0) * (m.r * 0.15);
            pos.setX(i, vx + Math.sin(angle) * noise);
            pos.setZ(i, vz + Math.cos(angle) * noise);
          }
        }
        geo.computeVertexNormals();
      }
      const hill = createToonMesh(geo, mountMat, 0.012);
      hill.position.set(m.x, m.h / 2 - 2, m.z);
      townGroup.add(hill);
    });

    // ── COCONUT TREES ───────────────────────────────────────────────
    const createCoconutTree = () => {
      const tree = new Group();
      const matWood = toon(COLORS.WOOD_LIGHT);
      const trunk = createToonMesh(new CylinderGeometry(0.15, 0.25, 2.8, 8), matWood, 0.02);
      trunk.position.y = 1.4;
      tree.add(trunk);
      const matLeaves = toon(COLORS.LEAF_GREEN);
      for (let i = 0; i < 5; i++) {
        const leaf = createToonMesh(new BoxGeometry(1.8, 0.1, 0.6), matLeaves, 0.02);
        const angle = (Math.PI * 2 / 5) * i;
        leaf.position.set(Math.cos(angle) * 0.8, 2.8, -Math.sin(angle) * 0.8);
        leaf.rotation.y = angle;
        leaf.rotation.z = 0.3;
        tree.add(leaf);
      }
      return tree;
    };

    const treeCoords = [
      { x: 35, z: -40 }, { x: 37, z: -20 }, { x: 35, z: 20 },
      { x: 55, z: -30 }, { x: 55, z: 10 },
      { x: -25, z: 10 }, { x: -30, z: 20 }, { x: 25, z: 10 },
      { x: -19, z: 0 }, { x: 19, z: 0 },
    ];
    treeCoords.forEach(tc => {
      const tree = createCoconutTree();
      tree.position.set(tc.x, 0, tc.z);
      townGroup.add(tree);
      structures.push({ x: tc.x, z: tc.z, radius: 0.8 });
    });

    // ── PLAZA RING TREES ────────────────────────────────────────────
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      if (Math.abs(Math.sin(angle)) < 0.2) continue;
      const px = Math.sin(angle) * 19;
      const pz = Math.cos(angle) * 19;
      const tree = createCoconutTree();
      tree.position.set(px, 0, pz);
      townGroup.add(tree);
      structures.push({ x: px, z: pz, radius: 0.8 });
    }

    // ── STREETLIGHTS ────────────────────────────────────────────────
    const spawnStreetlight = (sx: number, sz: number) => {
      const g = new Group();
      g.position.set(sx, 0, sz);
      const post = new Mesh(new CylinderGeometry(0.06, 0.08, 3.5, 8), toon(COLORS.METAL_DARK));
      post.position.y = 1.75; post.castShadow = true;
      g.add(post);
      const head = new Mesh(new BoxGeometry(0.8, 0.15, 0.15), toon(COLORS.METAL_DARK));
      head.position.set(0.3, 3.5, 0);
      g.add(head);
      const bulb = new Mesh(new SphereGeometry(0.08, 8, 8), toon(0xfff5b3, { emissive: 0xfff5b3, emissiveIntensity: 0.8 }));
      bulb.position.set(0.6, 3.4, 0);
      g.add(bulb);
      townGroup.add(g);
      structures.push({ x: sx, z: sz, radius: 0.3 });
    };

    const lightPositions = [
      [-8, -12], [8, -12], [-8, 12], [8, 12],
      [-8, 40], [8, 40], [-8, -40], [8, -40],
    ];
    lightPositions.forEach(([lx, lz]) => spawnStreetlight(lx!, lz!));

    // ── BUILDER HOUSES (Neighborhood) ───────────────────────────────
    members.forEach((member, i) => {
      const isLeft = i % 2 === 0;
      const row = Math.floor(i / 2);
      const plotX = isLeft ? 15 : -15;
      const plotZ = 28 + row * 22;

      // Simple house placeholder — house.js integration follows
      const houseGroup = new Group();
      houseGroup.position.set(plotX, 0, plotZ);

      const wallMat = toon(COLORS.WALL_CREAM);
      const body = createToonMesh(new BoxGeometry(6, 3.2, 5), wallMat, 0.02);
      body.position.y = 1.6; body.castShadow = true;
      houseGroup.add(body);

      const roofMat = toon(COLORS.ROOF_TERRACOTTA);
      const roof = createToonMesh(new ConeGeometry(4.8, 2.0, 4), roofMat, 0.02);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 4.2; roof.castShadow = true;
      houseGroup.add(roof);

      townGroup.add(houseGroup);
      structures.push({ x: plotX, z: plotZ, radius: 3.2 });

      interactables.push({
        x: plotX, z: plotZ + 3.5, radius: 1.8,
        message: `Press [E] to enter ${member.name}'s Workshop`,
        action: () => onInteract({ type: 'passport', member }),
      });

      // Resident NPC outside the house
      const npcMesh = createCharacter({ handle: member.handle, tags: member.tags });
      npcMesh.position.set(plotX + (isLeft ? -3 : 3), 0.35, plotZ + 2.5);
      npcMesh.rotation.y = isLeft ? Math.PI / 2 : -Math.PI / 2;
      townGroup.add(npcMesh);
      worldNPCs.push({
        mesh: npcMesh,
        type: 'resident',
        defaultFacing: isLeft ? Math.PI / 2 : -Math.PI / 2,
        animState: 'idle',
        time: Math.random() * 100,
      });

      interactables.push({
        x: npcMesh.position.x, z: npcMesh.position.z, radius: 2.0,
        message: `Press [E] to view ${member.name}'s Passport`,
        action: () => onInteract({ type: 'passport', member }),
      });
    });

    // ── HALL OF FAME ─────────────────────────────────────────────────
    const hofGroup = new Group();
    hofGroup.position.set(0, 0, 162);
    const hofBase = createToonMesh(new BoxGeometry(22, 6.5, 10), toon(COLORS.WALL_WHITE), 0.02);
    hofBase.position.y = 3.25; hofBase.castShadow = true;
    hofGroup.add(hofBase);
    const hofRoof = createToonMesh(new ConeGeometry(14, 3.0, 4), toon(COLORS.ROOF_RED), 0.02);
    hofRoof.rotation.y = Math.PI / 4; hofRoof.position.y = 8.0;
    hofGroup.add(hofRoof);
    townGroup.add(hofGroup);
    structures.push({ x: 0, z: 162, radius: 11 });

    // Podiums
    const podiumZ = 146;
    const podiumMats = [
      toon(COLORS.GOLD, { emissive: COLORS.GOLD, emissiveIntensity: 0.3 }),
      toon(0xd1d5db),
      toon(0xcd7f32),
    ];
    const podiumHeights = [1.2, 0.8, 0.4];

    members.slice(0, 3).forEach((member, i) => {
      const podium = new Mesh(new CylinderGeometry(0.8, 0.9, podiumHeights[i] ?? 0.4, 8), podiumMats[i]);
      const px = i === 0 ? 0 : i === 1 ? -2.5 : 2.5;
      podium.position.set(px, (podiumHeights[i] ?? 0.4) / 2, podiumZ);
      podium.castShadow = true;
      townGroup.add(podium);
      structures.push({ x: px, z: podiumZ, radius: 0.95 });

      const podChar = createCharacter({ handle: member.handle, tags: member.tags });
      podChar.position.set(px, podiumHeights[i] ?? 0.4, podiumZ);
      podChar.scale.setScalar(0.85);
      townGroup.add(podChar);

      const animStates: AnimationState[] = ['celebrate', 'wave', 'idle'];
      worldNPCs.push({
        mesh: podChar,
        type: 'shopkeeper',
        animState: animStates[i] ?? 'idle',
        time: Math.random() * 100,
      });

      interactables.push({
        x: px, z: podiumZ, radius: 1.8,
        message: `Press [E] to view ${member.name}'s Passport`,
        action: () => onInteract({ type: 'passport', member }),
      });
    });

    // Leaderboard plaque in front of HoF
    interactables.push({
      x: 0, z: 141.6, radius: 1.8,
      message: 'Press [E] to read Hall of Fame Rankings',
      action: () => onInteract({ type: 'leaderboard' }),
    });

    // ── Register world data ─────────────────────────────────────────
    setStructures(structures);
    setInteractables(interactables);

    return () => {
      scene.remove(townGroup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  return null;
}
