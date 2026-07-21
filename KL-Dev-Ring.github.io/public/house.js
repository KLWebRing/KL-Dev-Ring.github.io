/**
 * house.js - Procedural House & Workshop Interior Generation Engine
 * Designs custom low-poly houses, garden plots, mailboxes, and fences,
 * along with thematic 3D workshop interiors (AI Research Lab, Design Studio,
 * Hardware Workshop, Robotics Garage, Game Studio) populated with interactive props.
 */

// Determine interior type based on member tags
export function getBuilderInterest(tags = []) {
  const t = tags.map(val => val.toLowerCase());
  if (t.includes("ai") || t.includes("machine-learning") || t.includes("research") || t.includes("data-science")) {
    return "ai";
  }
  if (t.includes("robotics") || t.includes("iot") || t.includes("hardware") || t.includes("embedded")) {
    return "robotics";
  }
  if (t.includes("systems") || t.includes("infrastructure") || t.includes("security") || t.includes("kernel") || t.includes("compiler")) {
    return "systems";
  }
  if (t.includes("game") || t.includes("gamedev") || t.includes("graphics") || t.includes("unity") || t.includes("unreal")) {
    return "game";
  }
  // Default to Frontend/Design for webdev or others
  return "frontend";
}

// ── EXTERIOR GENERATION ──────────────────────────────────────────────────
export function createHouse(THREE, options = {}) {
  const group = new THREE.Group();
  group.name = `house_${options.handle}`;

  const seed = seeded(options.handle || "builder", 88);
  const hue = options.hue ?? 38;

  // Materials
  const matWalls = new THREE.MeshStandardMaterial({ 
    color: pickColor(seed, ["#f3f4f6", "#e5e7eb", "#fae8ff", "#ecfeff", "#fef9c3", "#ffedd5"]), 
    roughness: 0.9 
  });
  const matRoof = new THREE.MeshStandardMaterial({ 
    color: `hsl(${hue}, 70%, 35%)`, 
    roughness: 0.8 
  });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.5 });
  const matGlass = new THREE.MeshStandardMaterial({ 
    color: 0xe0f2fe, 
    emissive: 0x0ea5e9, 
    emissiveIntensity: 0.2, 
    roughness: 0.1 
  });
  const matDoor = new THREE.MeshStandardMaterial({ color: `hsl(${(hue + 120) % 360}, 60%, 30%)`, roughness: 0.7 });
  const matFence = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.9 });
  const matGrass = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.9 });

  // 1. Garden Plot / Lawn
  const plotW = 18;
  const plotD = 18;
  const lawn = new THREE.Mesh(
    new THREE.BoxGeometry(plotW, 0.1, plotD),
    new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.95 }) // Dark green lawn
  );
  lawn.position.y = -0.05;
  lawn.receiveShadow = true;
  group.add(lawn);

  // 2. Fences (Surrounding the plot, except the front center entry)
  const fenceGroup = new THREE.Group();
  fenceGroup.name = "fence";
  group.add(fenceGroup);

  const postGeo = new THREE.BoxGeometry(0.12, 0.8, 0.12);
  const railGeo = new THREE.BoxGeometry(plotW, 0.08, 0.04);
  const slatGeo = new THREE.BoxGeometry(0.08, 0.7, 0.02);

  // Back fence
  const fBack = new THREE.Group();
  fBack.position.set(0, 0.4, -plotD / 2 + 0.1);
  const railB1 = new THREE.Mesh(railGeo, matFence); railB1.position.y = 0.2;
  const railB2 = new THREE.Mesh(railGeo, matFence); railB2.position.y = -0.2;
  fBack.add(railB1, railB2);
  for (let x = -plotW / 2 + 0.3; x <= plotW / 2 - 0.3; x += 0.6) {
    const slat = new THREE.Mesh(slatGeo, matFence);
    slat.position.x = x;
    slat.castShadow = true;
    fBack.add(slat);
  }
  fenceGroup.add(fBack);

  // Left fence
  const fLeft = fBack.clone();
  fLeft.rotation.y = Math.PI / 2;
  fLeft.position.set(-plotW / 2 + 0.1, 0.4, 0);
  fenceGroup.add(fLeft);

  // Right fence
  const fRight = fBack.clone();
  fRight.rotation.y = Math.PI / 2;
  fRight.position.set(plotW / 2 - 0.1, 0.4, 0);
  fenceGroup.add(fRight);

  // Front fence (left side and right side of entry gate)
  const fFrontL = new THREE.Group();
  fFrontL.position.set(-plotW / 4 - 1.2, 0.4, plotD / 2 - 0.1);
  const railFL = new THREE.Mesh(new THREE.BoxGeometry(plotW / 2 - 2, 0.08, 0.04), matFence);
  railFL.position.y = 0.2;
  const railFL2 = railFL.clone(); railFL2.position.y = -0.2;
  fFrontL.add(railFL, railFL2);
  for (let x = -(plotW / 2 - 2) / 2 + 0.2; x <= (plotW / 2 - 2) / 2 - 0.2; x += 0.5) {
    const slat = new THREE.Mesh(slatGeo, matFence);
    slat.position.x = x;
    slat.castShadow = true;
    fFrontL.add(slat);
  }
  fenceGroup.add(fFrontL);

  const fFrontR = fFrontL.clone();
  fFrontR.position.x = plotW / 4 + 1.2;
  fenceGroup.add(fFrontR);

  // Gate Posts
  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), matWood);
  postL.position.set(-1.8, 0.45, plotD / 2 - 0.1);
  postL.castShadow = true;
  const postR = postL.clone();
  postR.position.x = 1.8;
  fenceGroup.add(postL, postR);

  // 3. Garden Path (leading from gate to house door)
  const pathW = 1.4;
  const pathD = 6;
  const pathMesh = new THREE.Mesh(
    new THREE.BoxGeometry(pathW, 0.02, pathD),
    new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.9 }) // Concrete slate path
  );
  pathMesh.position.set(0, 0.01, plotD / 2 - pathD / 2 - 0.1);
  pathMesh.receiveShadow = true;
  group.add(pathMesh);

  // 4. House Structure (Exterior walls)
  const hW = 6.5;
  const hH = 4.0;
  const hD = 5.5;
  const houseBox = new THREE.Mesh(new THREE.BoxGeometry(hW, hH, hD), matWalls);
  houseBox.position.set(0, hH / 2, -2.0);
  houseBox.castShadow = true;
  houseBox.receiveShadow = true;
  group.add(houseBox);

  // 5. Roof (Sloped prism)
  const rW = hW + 0.6;
  const rH = 1.8;
  const rD = hD + 0.6;
  const roof = new THREE.Group();
  roof.position.set(0, hH + 0.01, -2.0);

  const rMesh1 = new THREE.Mesh(new THREE.BoxGeometry(rW, 0.1, rD / 2 + 0.1), matRoof);
  rMesh1.position.set(0, rH / 2, -rD / 4);
  rMesh1.rotation.x = -0.5;
  rMesh1.castShadow = true;

  const rMesh2 = rMesh1.clone();
  rMesh2.position.z = rD / 4;
  rMesh2.rotation.x = 0.5;
  roof.add(rMesh1, rMesh2);

  // Triangular gables (ends of roof)
  const gableMat = matWalls.clone();
  const gableL = new THREE.Mesh(new THREE.ConeGeometry(rH, rH, 4), gableMat);
  gableL.rotation.y = Math.PI / 4;
  gableL.scale.set(1.0, 1.0, rD / rH / 2);
  gableL.position.set(-hW / 2 + 0.02, rH / 2 - 0.1, 0);
  // Simpler triangular blockers
  const gableGeo = new THREE.BoxGeometry(0.02, rH, rD);
  // Just use simple visual representation
  group.add(roof);

  // 6. Door
  const doorW = 1.1;
  const doorH = 2.2;
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.1), matDoor);
  door.position.set(0, doorH / 2, -2.0 + hD / 2 + 0.05);
  door.castShadow = true;
  group.add(door);

  const handleMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), matMetal);
  handleMesh.position.set(0.35, 0, 0.06);
  door.add(handleMesh);

  // 7. Windows
  const winGeo = new THREE.BoxGeometry(1.0, 1.2, 0.1);
  const winL = new THREE.Mesh(winGeo, matGlass);
  winL.position.set(-1.8, hH / 2 + 0.2, -2.0 + hD / 2 + 0.05);
  winL.castShadow = true;
  const winR = winL.clone();
  winR.position.x = 1.8;
  group.add(winL, winR);

  // Glowing yellow mesh representing lights inside (visible from side windows)
  const winSideGeo = new THREE.BoxGeometry(0.1, 1.0, 1.2);
  const winSideL = new THREE.Mesh(winSideGeo, matGlass);
  winSideL.position.set(-hW / 2 - 0.05, hH / 2 + 0.2, -2.0);
  const winSideR = winSideL.clone();
  winSideR.position.x = hW / 2 + 0.05;
  group.add(winSideL, winSideR);

  // 8. Mailbox
  const mailGroup = new THREE.Group();
  mailGroup.name = "mailbox";
  mailGroup.position.set(1.4, 0, plotD / 2 - 0.8);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 8), matWood);
  post.position.y = 0.55;
  post.castShadow = true;
  mailGroup.add(post);

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.4), matMetal);
  box.position.y = 1.1;
  box.rotation.y = -Math.PI / 12; // slightly rotated
  box.castShadow = true;
  mailGroup.add(box);

  // Mailbox flag
  const flagMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.04), flagMat);
  flag.position.set(0.13, 1.15, 0.05);
  mailGroup.add(flag);

  group.add(mailGroup);

  // 9. Workshop Addition (Side Garage)
  const wType = getBuilderInterest(options.tags);
  const wW = 4.2;
  const wH = 3.2;
  const wD = 4.8;
  const wShop = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, wD), matWalls);
  wShop.position.set(hW / 2 + wW / 2 - 0.2, wH / 2, -2.0);
  wShop.castShadow = true;
  wShop.receiveShadow = true;
  group.add(wShop);

  // Garage shutter door
  const shutMat = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.6, metalness: 0.6 });
  const shut = new THREE.Mesh(new THREE.BoxGeometry(wW - 0.6, wH - 0.6, 0.1), shutMat);
  shut.position.set(hW / 2 + wW / 2 - 0.2, wH / 2 - 0.1, -2.0 + wD / 2 + 0.05);
  shut.castShadow = true;
  group.add(shut);

  const wRoof = new THREE.Mesh(new THREE.BoxGeometry(wW + 0.3, 0.08, wD + 0.3), matRoof);
  wRoof.position.set(hW / 2 + wW / 2 - 0.2, wH + 0.04, -2.0);
  wRoof.rotation.z = -0.15; // Slanted roof
  wRoof.castShadow = true;
  group.add(wRoof);

  // Small decal sign based on workshop type
  let signText = "STUDIO";
  let signColor = 0x3b82f6; // blue
  if (wType === "ai") { signText = "LAB"; signColor = 0x8b5cf6; }
  else if (wType === "systems") { signText = "SYS"; signColor = 0xef4444; }
  else if (wType === "robotics") { signText = "ROBO"; signColor = 0x10b981; }
  else if (wType === "game") { signText = "GAME"; signColor = 0xf59e0b; }

  const signMat = new THREE.MeshStandardMaterial({ color: signColor, emissive: signColor, emissiveIntensity: 0.2 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.05), signMat);
  sign.position.set(hW / 2 + wW / 2 - 0.2, wH - 0.6, -2.0 + wD / 2 + 0.11);
  group.add(sign);

  // 10. Decorative details (Trees/flowers in garden)
  const treeSeed = seed + 0.5;
  const treeG = new THREE.Group();
  treeG.position.set(-plotW / 2 + 2.5, 0, -plotD / 2 + 3.0);
  
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.5, 8), matWood);
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  treeG.add(trunk);

  const foliageColor = pickColor(treeSeed, [0x15803d, 0x16a34a, 0x1e3a8a, 0xc2410c]); // green, blue, autumn orange
  const foliageMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.95 });
  const f1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1), foliageMat);
  f1.position.y = 2.4;
  f1.castShadow = true;
  const f2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8), foliageMat);
  f2.position.set(0.4, 2.9, -0.3);
  f2.castShadow = true;
  treeG.add(f1, f2);

  group.add(treeG);

  return group;
}

// ── INTERIOR WORKSHOP GENERATION ─────────────────────────────────────────
export function createInterior(THREE, styleType, options = {}) {
  const group = new THREE.Group();
  group.name = "interior";

  const roomW = 12;
  const roomH = 6;
  const roomD = 12;

  // Materials
  const matFloor = new THREE.MeshStandardMaterial({ 
    color: styleType === "frontend" ? 0xd1d5db : 0x27272a, // light tiles vs dark panels
    roughness: styleType === "frontend" ? 0.3 : 0.8 
  });
  const matWalls = new THREE.MeshStandardMaterial({ color: 0x090d0b, roughness: 0.95 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x513528, roughness: 0.8 });
  const matMetal = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.4, metalness: 0.6 });
  const matBlack = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });
  const matGlow = new THREE.MeshStandardMaterial({ 
    color: styleType === "ai" ? 0x00ffff : 
           styleType === "systems" ? 0xff3b30 : 
           styleType === "robotics" ? 0x00ff00 : 
           styleType === "game" ? 0xffcc00 : 0x00a8ff,
    emissive: styleType === "ai" ? 0x00ffff : 
              styleType === "systems" ? 0xff3b30 : 
              styleType === "robotics" ? 0x00ff00 : 
              styleType === "game" ? 0xffcc00 : 0x00a8ff,
    emissiveIntensity: 0.5 
  });

  // 1. Room Shell (Floor & Walls)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.1, roomD), matFloor);
  floor.position.y = -0.05;
  floor.receiveShadow = true;
  group.add(floor);

  // Back Wall
  const wallBack = new THREE.Mesh(new THREE.BoxGeometry(roomW, roomH, 0.1), matWalls);
  wallBack.position.set(0, roomH / 2, -roomD / 2);
  wallBack.receiveShadow = true;
  group.add(wallBack);

  // Left Wall
  const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, roomH, roomD), matWalls);
  wallLeft.position.set(-roomW / 2, roomH / 2, 0);
  wallLeft.receiveShadow = true;
  group.add(wallLeft);

  // Right Wall
  const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, roomH, roomD), matWalls);
  wallRight.position.set(roomW / 2, roomH / 2, 0);
  wallRight.receiveShadow = true;
  group.add(wallRight);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.1, roomD), matWalls);
  ceiling.position.y = roomH + 0.05;
  group.add(ceiling);

  // 2. Doorway (Back out to town)
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.2), matWood);
  doorFrame.position.set(0, 1.3, roomD / 2 - 0.1);
  group.add(doorFrame);

  // 3. Desk (All workshops get a computer desk)
  const deskGroup = new THREE.Group();
  deskGroup.name = "computerDesk";
  deskGroup.position.set(0, 0, -roomD / 2 + 1.2); // Central back wall

  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 1.4), matWood);
  tableTop.position.y = 0.8;
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  deskGroup.add(tableTop);

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 1.2), matMetal);
  legL.position.set(-1.6, 0.4, 0);
  legL.castShadow = true;
  const legR = legL.clone();
  legR.position.x = 1.6;
  deskGroup.add(legL, legR);

  // Keyboard and Mouse
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.22), matBlack);
  kb.position.set(0, 0.85, 0.2);
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.12), matBlack);
  mouse.position.set(0.6, 0.85, 0.2);
  deskGroup.add(kb, mouse);

  // Dual/Triple Monitors
  const monStand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), matMetal);
  monStand.position.set(0, 1.0, -0.3);
  deskGroup.add(monStand);

  const monCenter = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.05), matBlack);
  monCenter.position.set(0, 1.3, -0.3);
  monCenter.castShadow = true;
  const monScreen = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.62, 0.01), matGlow);
  monScreen.position.set(0, 1.3, -0.27);
  deskGroup.add(monCenter, monScreen);

  // Side monitor (angled)
  const monL = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.05), matBlack);
  monL.position.set(-1.0, 1.25, -0.2);
  monL.rotation.y = 0.4;
  const monLScreen = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.54, 0.01), matGlow);
  monLScreen.position.set(-1.0, 1.25, -0.17);
  monLScreen.rotation.y = 0.4;
  deskGroup.add(monL, monLScreen);

  // Chair
  const chair = new THREE.Group();
  chair.position.set(0, 0, 0.9);
  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), matMetal);
  cBase.position.y = 0.225;
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), matBlack);
  cSeat.position.y = 0.45;
  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.08), matBlack);
  cBack.position.set(0, 0.8, -0.26);
  chair.add(cBase, cSeat, cBack);
  deskGroup.add(chair);

  group.add(deskGroup);

  // ── THEMATIC DECORATION ───────────────────────────────────────────────
  switch (styleType) {
    case "ai": // Research Lab
      // 1. Server Racks
      const servers = new THREE.Group();
      servers.position.set(-roomW / 2 + 1.2, 0, -roomD / 2 + 3.0);
      for (let z = 0; z < 2; z++) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.8, 1.0), matBlack);
        rack.position.set(0, 1.9, z * 1.5);
        rack.castShadow = true;
        
        // Glow stripes (blinking lights)
        const stripeGroup = new THREE.Group();
        stripeGroup.name = "lights";
        for (let y = 0.4; y < 3.6; y += 0.3) {
          const lLight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.08), matGlow);
          lLight.position.set(0.601, y, -0.3 + Math.random() * 0.6);
          stripeGroup.add(lLight);
        }
        rack.add(stripeGroup);
        servers.add(rack);
      }
      group.add(servers);

      // 2. Hologram Pedestal (Center of the room)
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 0.8, 8), matMetal);
      ped.position.set(0, 0.4, 1.5);
      ped.castShadow = true;
      group.add(ped);

      const holoSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.6 })
      );
      holoSphere.name = "hologram";
      holoSphere.position.set(0, 1.7, 1.5);
      group.add(holoSphere);
      break;

    case "frontend": // Design Studio
      // 1. Color Palette poster on wall
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.0, 3.0), matWood);
      frame.position.set(-roomW / 2 + 0.05, 3.0, 1.0);
      
      const colors = ["#ff3b30", "#ff9500", "#ffcc00", "#4cd964", "#5ac8fa", "#007aff", "#5856d6", "#ff2d55"];
      for (let i = 0; i < colors.length; i++) {
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(0.01, 0.35, 0.5), 
          new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5 })
        );
        block.position.set(0.03, -0.6 + Math.floor(i / 2) * 0.42, -0.8 + (i % 2) * 0.9);
        frame.add(block);
      }
      group.add(frame);

      // 2. Painting Easel
      const easel = new THREE.Group();
      easel.position.set(roomW / 2 - 2.5, 0, 1.5);
      easel.rotation.y = -Math.PI / 4;

      const eLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), matWood);
      eLeg1.position.set(-0.5, 1.1, 0);
      eLeg1.rotation.z = -0.15;
      const eLeg2 = eLeg1.clone();
      eLeg2.position.x = 0.5;
      eLeg2.rotation.z = 0.15;
      const eLeg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), matWood);
      eLeg3.position.set(0, 1.1, -0.4);
      eLeg3.rotation.x = -0.2;
      easel.add(eLeg1, eLeg2, eLeg3);

      const canvas = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.9, 0.04), 
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 })
      );
      canvas.position.set(0, 1.5, 0.04);
      canvas.rotation.x = 0.08;
      canvas.castShadow = true;
      easel.add(canvas);

      // Painterly splashes on canvas
      for (let j = 0; j < 5; j++) {
        const s = new THREE.Mesh(
          new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 6, 6),
          new THREE.MeshStandardMaterial({ color: colors[Math.floor(Math.random() * colors.length)], roughness: 0.8 })
        );
        s.scale.z = 0.1;
        s.position.set(Math.random() * 0.6 - 0.3, Math.random() * 0.5 - 0.25, 0.03);
        canvas.add(s);
      }
      group.add(easel);
      break;

    case "systems": // Hardware Workshop
      // 1. Heavy Workbench
      const bench = new THREE.Group();
      bench.position.set(-roomW / 2 + 1.5, 0, 1.0);
      
      const bTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 4.0), matWood);
      bTop.position.set(0, 0.8, 0);
      bTop.castShadow = true;
      bench.add(bTop);

      const bLeg1 = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.1), matMetal);
      bLeg1.position.set(0, 0.4, -1.8);
      const bLeg2 = bLeg1.clone();
      bLeg2.position.z = 1.8;
      bench.add(bLeg1, bLeg2);

      // Oscilloscope
      const scope = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.4), matBlack);
      scope.position.set(-0.1, 0.98, -1.0);
      const scopeScreen = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.22, 0.26), matGlow);
      scopeScreen.position.set(0.201, 0.98, -1.0);
      bench.add(scope, scopeScreen);

      // Small oscilloscope sine wave lines represented by green boxes
      const waveGroup = new THREE.Group();
      waveGroup.name = "wave";
      waveGroup.position.set(0.21, 0.98, -1.0);
      for (let x = -0.1; x <= 0.1; x += 0.02) {
        const pt = new THREE.Mesh(new THREE.BoxGeometry(0.002, 0.01, 0.01), matGlow);
        pt.position.z = x;
        waveGroup.add(pt);
      }
      bench.add(waveGroup);

      // Hardware components racks
      const components = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.8), matMetal);
      components.position.set(0.1, 1.0, 0.8);
      bench.add(components);

      group.add(bench);
      break;

    case "robotics": // Robotics Garage
      // 1. Robot Assembly Table
      const rTable = new THREE.Group();
      rTable.position.set(roomW / 2 - 2.0, 0, -1.0);
      const rTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 3.2), matMetal);
      rTop.position.y = 0.85;
      rTop.castShadow = true;
      rTable.add(rTop);
      
      const rLegL = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 0.15), matMetal);
      rLegL.position.set(0, 0.425, -1.3);
      const rLegR = rLegL.clone();
      rLegR.position.z = 1.3;
      rTable.add(rLegL, rLegR);

      // Mechanical Robot Arm
      const armGroup = new THREE.Group();
      armGroup.name = "robotArm";
      armGroup.position.set(0, 0.9, 0.2);
      
      const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 8), matBlack);
      armBase.position.y = 0.125;
      armGroup.add(armBase);

      const armPivot1 = new THREE.Group();
      armPivot1.name = "armPivot1";
      armPivot1.position.set(0, 0.25, 0);
      
      const armSeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), matGlow);
      armSeg1.position.y = 0.35;
      armPivot1.add(armSeg1);
      
      const armPivot2 = new THREE.Group();
      armPivot2.name = "armPivot2";
      armPivot2.position.set(0, 0.7, 0);
      
      const armSeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.08), matMetal);
      armSeg2.position.y = 0.3;
      
      const claw = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), matBlack);
      claw.position.y = 0.6;
      armSeg2.add(claw);
      
      armPivot2.add(armSeg2);
      armPivot1.add(armPivot2);
      armGroup.add(armPivot1);
      rTable.add(armGroup);

      group.add(rTable);
      break;

    case "game": // Game Studio
      // 1. Arcade Cabinet
      const arcade = new THREE.Group();
      arcade.position.set(roomW / 2 - 1.5, 0, 2.0);
      arcade.rotation.y = -Math.PI / 2;

      const cabMat = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.5 }); // Pink cabinet
      
      const bodyGeo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
      const cabBody = new THREE.Mesh(bodyGeo, cabMat);
      cabBody.position.y = 0.9;
      cabBody.castShadow = true;
      arcade.add(cabBody);

      // Angled screen slot
      const aScreen = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 0.02), matGlow);
      aScreen.position.set(0, 1.25, 0.401);
      arcade.add(aScreen);

      // Joysticks desk
      const joyDesk = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.3), matBlack);
      joyDesk.position.set(0, 0.85, 0.45);
      arcade.add(joyDesk);

      const joy1 = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4), matMetal);
      joy1.position.set(-0.2, 0.92, 0.45);
      const joyBall = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), matGlow);
      joyBall.position.set(-0.2, 0.97, 0.45);
      arcade.add(joy1, joyBall);

      group.add(arcade);
      break;
  }

  // 4. General room details (Streetlight style lamp hanging from ceiling)
  const lamp = new THREE.Group();
  lamp.position.set(0, roomH - 0.2, 0);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4), matMetal);
  cord.position.y = 0.4;
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 0.3, 8), matMetal);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), matGlow);
  bulb.position.y = -0.15;
  lamp.add(cord, shade, bulb);
  group.add(lamp);

  return group;
}

// ── WORKSHOP INTERIOR ANIMATIONS ────────────────────────────────────────
export function animateInterior(THREE, interiorGroup, time, styleType) {
  if (!interiorGroup) return;

  const t = time;

  if (styleType === "ai") {
    // Spin the hologram
    const holo = interiorGroup.getObjectByName("hologram");
    if (holo) {
      holo.rotation.y = t * 0.5;
      holo.rotation.x = t * 0.2;
      holo.position.y = 1.7 + Math.sin(t * 1.5) * 0.08;
    }
    
    // Animate server lights (random blinking)
    interiorGroup.traverse(child => {
      if (child.name === "lights") {
        child.children.forEach((light, i) => {
          // Blinking effect
          const intensity = Math.sin(t * 12 + i) > 0.1 ? 0.6 : 0.08;
          light.material.emissiveIntensity = intensity;
        });
      }
    });
  } 
  else if (styleType === "systems") {
    // Animate oscilloscope green dots (sine wave propagation)
    const wave = interiorGroup.getObjectByName("wave");
    if (wave) {
      wave.children.forEach((pt, i) => {
        const xOffset = pt.position.z * 15;
        pt.position.y = Math.sin(t * 10 + xOffset) * 0.07;
      });
    }
  } 
  else if (styleType === "robotics") {
    // Animate robot arm (scanning motion)
    const pivot1 = interiorGroup.getObjectByName("armPivot1");
    const pivot2 = interiorGroup.getObjectByName("armPivot2");
    
    if (pivot1) {
      pivot1.rotation.y = Math.sin(t * 1.2) * 0.6;
      pivot1.rotation.z = Math.sin(t * 0.6) * 0.15;
    }
    if (pivot2) {
      pivot2.rotation.z = -0.2 + Math.cos(t * 1.5) * 0.3;
    }
  }
}

// Utility: seedable pseudo-random helper
function seeded(value, salt = 0) {
  let hash = 2166136261 + salt * 101;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 10000) / 10000;
}

function pickColor(val, list) {
  const idx = Math.floor((val % 1) * list.length);
  return list[idx];
}
