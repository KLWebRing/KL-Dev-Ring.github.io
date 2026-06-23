/**
 * character.js - Procedural Character Generation & Animation Engine (CharacterGen)
 * Generates low-poly characters from developer metadata (styling, clothing, accessories)
 * and animates them using trigonometric procedural keyframing.
 * Refactored to support articulate, human-like stylized skeletons with elbow and knee joint bends.
 * Upgraded to use MeshToonMaterial and outline hulls for a cel-shaded anime aesthetic.
 * Special webtoon style upgrade: includes detailed red jackets, face masks, crossbody bags, socks, and retro sneakers.
 */

// Helper to create toon meshes with backface outline hulls
export function createToonMesh(THREE, geometry, material, outlineThickness = 0.04, outlineColor = 0x2c2d30) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  if (outlineThickness > 0) {
    const outlineMaterial = new THREE.MeshBasicMaterial({
      color: outlineColor,
      side: THREE.BackSide
    });
    const outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
    outlineMesh.scale.setScalar(1 + outlineThickness);
    outlineMesh.castShadow = false;
    outlineMesh.receiveShadow = false;
    mesh.add(outlineMesh);
  }
  return mesh;
}

export function createCharacter(THREE, options = {}) {
  const group = new THREE.Group();
  group.name = "character";

  const tags = options.tags || [];

  // Deterministic random styling based on builder handle
  const seedHair = seeded(options.handle || "player", 42);
  const seedCoat = seeded(options.handle || "player", 101);
  const seedSkin = seeded(options.handle || "player", 202);

  const hairColor = options.hairColor || pickColor(seedHair, ["#302a3a", "#262230", "#3a3348", "#1c1829"]); // Dark purple/black hair
  const coatColor = options.shirtColor || pickColor(seedCoat, ["#dc2626", "#e11d48", "#be123c", "#b91c1c"]); // Shades of red
  const pantsColor = "#18181b"; // Dark charcoal skirt/shorts
  const skinColor = options.skinColor || pickColor(seedSkin, ["#fcd34d", "#fca5a5", "#f59e0b", "#d97706", "#b45309", "#854d0e"]);
  const shoeColor = "#111111";

  // Primary toon materials
  const matSkin = new THREE.MeshToonMaterial({ color: skinColor });
  const matCoat = new THREE.MeshToonMaterial({ color: coatColor });
  const matPants = new THREE.MeshToonMaterial({ color: pantsColor });
  const matHair = new THREE.MeshToonMaterial({ color: hairColor });
  const matShoes = new THREE.MeshToonMaterial({ color: shoeColor });
  const matBlack = new THREE.MeshToonMaterial({ color: 0x18181b }); // glossy eyes / bag
  const matWhite = new THREE.MeshToonMaterial({ color: 0xffffff }); // mask / socks / buttons
  const matTeal = new THREE.MeshToonMaterial({ color: 0x0d9488 }); // chunky shoe sole

  // Body container (for overall character scale/bobbing)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = "bodyGroup";
  group.add(bodyGroup);

  // Pelvis / Hips (base of torso)
  const geoPelvis = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12);
  const pelvis = createToonMesh(THREE, geoPelvis, matPants, 0.04);
  pelvis.name = "pelvis";
  pelvis.position.y = 0.32;
  bodyGroup.add(pelvis);

  // Skirt/shorts drape extension
  const geoSkirt = new THREE.CylinderGeometry(0.185, 0.20, 0.16, 12);
  const skirt = createToonMesh(THREE, geoSkirt, matPants, 0.03);
  skirt.position.y = 0.22;
  bodyGroup.add(skirt);

  // Torso (Jacket style)
  const geoTorso = new THREE.CylinderGeometry(0.18, 0.18, 0.44, 12);
  const torso = createToonMesh(THREE, geoTorso, matCoat, 0.04);
  torso.name = "torso";
  torso.position.y = 0.58;
  bodyGroup.add(torso);

  // White Lapels / Collar on Jacket
  const lapelL = createToonMesh(THREE, new THREE.BoxGeometry(0.06, 0.12, 0.03), matWhite, 0.02);
  lapelL.position.set(-0.06, 0.18, 0.1);
  lapelL.rotation.set(0.1, 0.1, -0.4);
  torso.add(lapelL);

  const lapelR = createToonMesh(THREE, new THREE.BoxGeometry(0.06, 0.12, 0.03), matWhite, 0.02);
  lapelR.position.set(0.06, 0.18, 0.1);
  lapelR.rotation.set(0.1, -0.1, 0.4);
  torso.add(lapelR);

  // Chest pockets
  const pocketL = createToonMesh(THREE, new THREE.BoxGeometry(0.07, 0.06, 0.02), matWhite, 0.015);
  pocketL.position.set(-0.08, 0.08, 0.1);
  pocketL.rotation.y = 0.1;
  torso.add(pocketL);
  
  const pocketR = createToonMesh(THREE, new THREE.BoxGeometry(0.07, 0.06, 0.02), matWhite, 0.015);
  pocketR.position.set(0.08, 0.08, 0.1);
  pocketR.rotation.y = -0.1;
  torso.add(pocketR);

  // Tiny pocket buttons
  const pBtnL = createToonMesh(THREE, new THREE.SphereGeometry(0.012, 4, 4), matBlack, 0);
  pBtnL.position.set(-0.08, 0.08, 0.115);
  torso.add(pBtnL);

  const pBtnR = createToonMesh(THREE, new THREE.SphereGeometry(0.012, 4, 4), matBlack, 0);
  pBtnR.position.set(0.08, 0.08, 0.115);
  torso.add(pBtnR);

  // Vertical center zip/seam and buttons
  const seam = createToonMesh(THREE, new THREE.BoxGeometry(0.015, 0.44, 0.01), matBlack, 0);
  seam.position.set(0, 0, 0.095);
  torso.add(seam);
  
  for (let b = 0; b < 3; b++) {
    const button = createToonMesh(THREE, new THREE.SphereGeometry(0.016, 4, 4), matWhite, 0);
    button.position.set(0, 0.1 - b * 0.12, 0.105);
    torso.add(button);
  }

  // Crossbody Bag Strap & Bag
  const strapFront = createToonMesh(THREE, new THREE.BoxGeometry(0.025, 0.58, 0.015), matBlack, 0);
  strapFront.position.set(0, 0, 0.1);
  strapFront.rotation.z = -0.66;
  torso.add(strapFront);

  const strapBack = createToonMesh(THREE, new THREE.BoxGeometry(0.025, 0.58, 0.015), matBlack, 0);
  strapBack.position.set(0, 0, -0.1);
  strapBack.rotation.z = 0.66;
  torso.add(strapBack);

  const bag = createToonMesh(THREE, new THREE.BoxGeometry(0.16, 0.12, 0.06), matBlack, 0.02);
  bag.position.set(0.18, -0.18, 0.06);
  bag.rotation.set(0.2, -0.2, -0.3);

  // Add a flap on the bag using a slightly thinner white box
  const bagFlap = createToonMesh(THREE, new THREE.BoxGeometry(0.164, 0.07, 0.064), matWhite, 0);
  bagFlap.position.set(0, 0.03, 0.002);
  bag.add(bagFlap);

  torso.add(bag);

  // Neck
  const geoNeck = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 8);
  const neck = createToonMesh(THREE, geoNeck, matSkin, 0.04);
  neck.position.y = 0.84;
  bodyGroup.add(neck);

  // Head Group (Pivot at bottom of head)
  const headGroup = new THREE.Group();
  headGroup.name = "head";
  headGroup.position.y = 0.89;
  bodyGroup.add(headGroup);

  // Sphere Head
  const geoHead = new THREE.SphereGeometry(0.2, 16, 16);
  const headMesh = createToonMesh(THREE, geoHead, matSkin, 0.04);
  headMesh.position.y = 0.2;
  headGroup.add(headMesh);

  // White Face Mask
  const mask = createToonMesh(THREE, new THREE.BoxGeometry(0.15, 0.07, 0.05), matWhite, 0.02);
  mask.position.set(0, 0.13, 0.185);
  mask.rotation.x = 0.1;
  headGroup.add(mask);

  const maskStrapL = createToonMesh(THREE, new THREE.BoxGeometry(0.015, 0.015, 0.12), matWhite, 0);
  maskStrapL.position.set(-0.11, 0.15, 0.09);
  maskStrapL.rotation.set(0, 0.4, 0);
  headGroup.add(maskStrapL);
  
  const maskStrapR = createToonMesh(THREE, new THREE.BoxGeometry(0.015, 0.015, 0.12), matWhite, 0);
  maskStrapR.position.set(0.11, 0.15, 0.09);
  maskStrapR.rotation.set(0, -0.4, 0);
  headGroup.add(maskStrapR);

  // Rounded Nose
  const geoNose = new THREE.SphereGeometry(0.035, 8, 8);
  const nose = createToonMesh(THREE, geoNose, matSkin, 0);
  nose.position.set(0, 0.18, 0.2);
  headGroup.add(nose);

  // Ears
  const geoEar = new THREE.SphereGeometry(0.038, 8, 8);
  const earL = createToonMesh(THREE, geoEar, matSkin, 0.04);
  earL.position.set(-0.21, 0.2, 0);
  const earR = createToonMesh(THREE, geoEar, matSkin, 0.04);
  earR.position.set(0.21, 0.2, 0);
  headGroup.add(earL, earR);

  // Glossy Eyes (flat, slanted boxes for clean anime look)
  const eyeL = createToonMesh(THREE, new THREE.BoxGeometry(0.045, 0.015, 0.01), matBlack, 0);
  eyeL.position.set(-0.07, 0.23, 0.188);
  eyeL.rotation.set(0.05, 0.35, 0.05);

  const eyeR = createToonMesh(THREE, new THREE.BoxGeometry(0.045, 0.015, 0.01), matBlack, 0);
  eyeR.position.set(0.07, 0.23, 0.188);
  eyeR.rotation.set(0.05, -0.35, -0.05);

  headGroup.add(eyeL, eyeR);

  // Eyebrows
  const geoBrow = new THREE.BoxGeometry(0.05, 0.012, 0.012);
  const browL = createToonMesh(THREE, geoBrow, matHair, 0);
  browL.position.set(-0.07, 0.26, 0.19);
  browL.rotation.set(0.05, 0.35, 0.05);
  
  const browR = createToonMesh(THREE, geoBrow, matHair, 0);
  browR.position.set(0.07, 0.26, 0.19);
  browR.rotation.set(0.05, -0.35, -0.05);

  headGroup.add(browL, browR);

  // Volumetric bob hairstyle (consistent target style)
  const hairGroup = new THREE.Group();
  hairGroup.name = "hair";
  headGroup.add(hairGroup);

  const hairCap = createToonMesh(THREE, new THREE.SphereGeometry(0.21, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), matHair, 0.04);
  hairCap.position.y = 0.2;
  hairCap.scale.set(1.04, 1.02, 1.04);
  hairGroup.add(hairCap);
  
  // Center bangs
  const bangsCenter = createToonMesh(THREE, new THREE.BoxGeometry(0.12, 0.09, 0.08), matHair, 0.03);
  bangsCenter.position.set(0, 0.32, 0.15);
  bangsCenter.rotation.x = -0.2;
  hairGroup.add(bangsCenter);

  // Left bangs
  const bangsL = createToonMesh(THREE, new THREE.BoxGeometry(0.1, 0.09, 0.07), matHair, 0.03);
  bangsL.position.set(-0.09, 0.30, 0.14);
  bangsL.rotation.set(-0.2, 0.15, -0.1);
  hairGroup.add(bangsL);

  // Right bangs
  const bangsR = createToonMesh(THREE, new THREE.BoxGeometry(0.1, 0.09, 0.07), matHair, 0.03);
  bangsR.position.set(0.09, 0.30, 0.14);
  bangsR.rotation.set(-0.2, -0.15, 0.1);
  hairGroup.add(bangsR);
  
  const lockL = createToonMesh(THREE, new THREE.BoxGeometry(0.06, 0.22, 0.10), matHair, 0.03);
  lockL.position.set(-0.19, 0.15, 0.06);
  lockL.rotation.set(0.1, 0.1, -0.15);
  
  const lockR = createToonMesh(THREE, new THREE.BoxGeometry(0.06, 0.22, 0.10), matHair, 0.03);
  lockR.position.set(0.19, 0.15, 0.06);
  lockR.rotation.set(0.1, -0.1, 0.15);
  hairGroup.add(lockL, lockR);
  
  const backDrape = createToonMesh(THREE, new THREE.BoxGeometry(0.38, 0.18, 0.12), matHair, 0.03);
  backDrape.position.set(0, 0.09, -0.14);
  backDrape.rotation.x = 0.1;
  hairGroup.add(backDrape);

  // Straw Hat Accessory (Default for player, seed-based for NPCs)
  const isPlayer = options.handle === "player";
  const hasStrawHat = isPlayer || (seeded(options.handle || "npc", 77) > 0.82);

  if (hasStrawHat) {
    const hatGroup = new THREE.Group();
    hatGroup.name = "strawHat";
    hatGroup.position.set(0, 0.41, 0.01);
    hatGroup.rotation.x = 0.05;

    const matHatYellow = new THREE.MeshToonMaterial({ color: 0xeab308 });
    const brim = createToonMesh(THREE, new THREE.CylinderGeometry(0.35, 0.35, 0.02, 12), matHatYellow, 0.02);
    hatGroup.add(brim);

    const crown = createToonMesh(THREE, new THREE.SphereGeometry(0.16, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2), matHatYellow, 0.02);
    crown.position.y = 0.01;
    hatGroup.add(crown);

    const matHatRed = new THREE.MeshToonMaterial({ color: 0xdc2626 });
    const band = createToonMesh(THREE, new THREE.CylinderGeometry(0.162, 0.162, 0.04, 12), matHatRed, 0.02);
    band.position.y = 0.02;
    hatGroup.add(band);

    headGroup.add(hatGroup);
  }

  // ── LIMBS SETUP (WITH ELBOW & KNEE JOINTS) ──────────────────────────────

  // LEFT ARM: Shoulder Pivot -> Upper Arm -> Elbow Pivot -> Lower Arm -> Hand
  const pivotLArm = new THREE.Group();
  pivotLArm.name = "pivotLArm";
  pivotLArm.position.set(-0.21, 0.72, 0); // Shoulder socket (snug to torso)
  
  const shoulderL = createToonMesh(THREE, new THREE.SphereGeometry(0.075, 8, 8), matCoat, 0.04);
  pivotLArm.add(shoulderL);

  const meshLArm = createToonMesh(THREE, new THREE.CylinderGeometry(0.07, 0.065, 0.24, 8), matCoat, 0.04);
  meshLArm.name = "upperArm";
  meshLArm.position.y = -0.12;
  pivotLArm.add(meshLArm);

  // White cuff at the elbow
  const cuffL = createToonMesh(THREE, new THREE.CylinderGeometry(0.075, 0.075, 0.04, 8), matWhite, 0.02);
  cuffL.position.y = -0.21;
  pivotLArm.add(cuffL);

  const pivotLElbow = new THREE.Group();
  pivotLElbow.name = "pivotLElbow";
  pivotLElbow.position.set(0, -0.24, 0); // Elbow joint
  meshLArm.add(pivotLElbow);

  const elbowL = createToonMesh(THREE, new THREE.SphereGeometry(0.065, 8, 8), matCoat, 0.04);
  pivotLElbow.add(elbowL);

  const meshLForearm = createToonMesh(THREE, new THREE.CylinderGeometry(0.065, 0.06, 0.22, 8), matSkin, 0.04);
  meshLForearm.name = "foreArm";
  meshLForearm.position.y = -0.11;
  pivotLElbow.add(meshLForearm);

  const handL = createToonMesh(THREE, new THREE.SphereGeometry(0.07, 8, 8), matSkin, 0.04);
  handL.position.y = -0.22;
  meshLForearm.add(handL);

  bodyGroup.add(pivotLArm);

  // RIGHT ARM
  const pivotRArm = new THREE.Group();
  pivotRArm.name = "pivotRArm";
  pivotRArm.position.set(0.21, 0.72, 0); // Shoulder socket (snug to torso)
  
  const shoulderR = createToonMesh(THREE, new THREE.SphereGeometry(0.075, 8, 8), matCoat, 0.04);
  pivotRArm.add(shoulderR);

  const meshRArm = createToonMesh(THREE, new THREE.CylinderGeometry(0.07, 0.065, 0.24, 8), matCoat, 0.04);
  meshRArm.name = "upperArm";
  meshRArm.position.y = -0.12;
  pivotRArm.add(meshRArm);

  // White cuff at the elbow
  const cuffR = createToonMesh(THREE, new THREE.CylinderGeometry(0.075, 0.075, 0.04, 8), matWhite, 0.02);
  cuffR.position.y = -0.21;
  pivotRArm.add(cuffR);

  const pivotRElbow = new THREE.Group();
  pivotRElbow.name = "pivotRElbow";
  pivotRElbow.position.set(0, -0.24, 0);
  meshRArm.add(pivotRElbow);

  const elbowR = createToonMesh(THREE, new THREE.SphereGeometry(0.065, 8, 8), matCoat, 0.04);
  pivotRElbow.add(elbowR);

  const meshRForearm = createToonMesh(THREE, new THREE.CylinderGeometry(0.065, 0.06, 0.22, 8), matSkin, 0.04);
  meshRForearm.name = "foreArm";
  meshRForearm.position.y = -0.11;
  pivotRElbow.add(meshRForearm);

  const handR = createToonMesh(THREE, new THREE.SphereGeometry(0.07, 8, 8), matSkin, 0.04);
  handR.position.y = -0.22;
  meshRForearm.add(handR);

  bodyGroup.add(pivotRArm);

  // LEFT LEG: Hip Pivot -> Upper Leg -> Knee Pivot -> Lower Leg -> Shoe
  const pivotLLeg = new THREE.Group();
  pivotLLeg.name = "pivotLLeg";
  pivotLLeg.position.set(-0.11, 0.28, 0); // Hip socket
  
  const hipL = createToonMesh(THREE, new THREE.SphereGeometry(0.085, 8, 8), matPants, 0.04);
  pivotLLeg.add(hipL);

  const meshLLeg = createToonMesh(THREE, new THREE.CylinderGeometry(0.085, 0.08, 0.22, 8), matPants, 0.04);
  meshLLeg.name = "upperLeg";
  meshLLeg.position.y = -0.11;
  pivotLLeg.add(meshLLeg);

  const pivotLKnee = new THREE.Group();
  pivotLKnee.name = "pivotLKnee";
  pivotLKnee.position.set(0, -0.22, 0); // Knee joint
  meshLLeg.add(pivotLKnee);

  const kneeL = createToonMesh(THREE, new THREE.SphereGeometry(0.08, 8, 8), matPants, 0.04);
  pivotLKnee.add(kneeL);

  const meshLCalf = createToonMesh(THREE, new THREE.CylinderGeometry(0.08, 0.075, 0.2, 8), matSkin, 0.04); // Skin-colored calf
  meshLCalf.name = "calf";
  meshLCalf.position.y = -0.1;
  pivotLKnee.add(meshLCalf);

  // White sock at the bottom of calf
  const sockL = createToonMesh(THREE, new THREE.CylinderGeometry(0.082, 0.082, 0.08, 8), matWhite, 0.02);
  sockL.position.y = -0.12;
  meshLCalf.add(sockL);

  // Chunky Retro Sneaker
  const shoeLGroup = new THREE.Group();
  shoeLGroup.position.set(0, -0.2, 0.02);
  
  const soleL = createToonMesh(THREE, new THREE.BoxGeometry(0.14, 0.035, 0.22), matTeal, 0.01);
  soleL.position.y = -0.035;
  shoeLGroup.add(soleL);
  
  const bodyL = createToonMesh(THREE, new THREE.BoxGeometry(0.13, 0.08, 0.21), matWhite, 0.015);
  bodyL.position.y = 0.02;
  shoeLGroup.add(bodyL);
  
  const toeCapL = createToonMesh(THREE, new THREE.BoxGeometry(0.125, 0.04, 0.05), matCoat, 0.015);
  toeCapL.position.set(0, 0.01, 0.085);
  shoeLGroup.add(toeCapL);
  
  const heelCapL = createToonMesh(THREE, new THREE.BoxGeometry(0.125, 0.06, 0.04), matCoat, 0.015);
  heelCapL.position.set(0, 0.02, -0.09);
  shoeLGroup.add(heelCapL);
  
  const tongueL = createToonMesh(THREE, new THREE.BoxGeometry(0.09, 0.03, 0.1), matBlack, 0);
  tongueL.position.set(0, 0.065, 0.02);
  shoeLGroup.add(tongueL);

  meshLCalf.add(shoeLGroup);

  bodyGroup.add(pivotLLeg);

  // RIGHT LEG
  const pivotRLeg = new THREE.Group();
  pivotRLeg.name = "pivotRLeg";
  pivotRLeg.position.set(0.11, 0.28, 0);
  
  const hipR = createToonMesh(THREE, new THREE.SphereGeometry(0.085, 8, 8), matPants, 0.04);
  pivotRLeg.add(hipR);

  const meshRLeg = createToonMesh(THREE, new THREE.CylinderGeometry(0.085, 0.08, 0.22, 8), matPants, 0.04);
  meshRLeg.name = "upperLeg";
  meshRLeg.position.y = -0.11;
  pivotRLeg.add(meshRLeg);

  const pivotRKnee = new THREE.Group();
  pivotRKnee.name = "pivotRKnee";
  pivotRKnee.position.set(0, -0.22, 0);
  meshRLeg.add(pivotRKnee);

  const kneeR = createToonMesh(THREE, new THREE.SphereGeometry(0.08, 8, 8), matPants, 0.04);
  pivotRKnee.add(kneeR);

  const meshRCalf = createToonMesh(THREE, new THREE.CylinderGeometry(0.08, 0.075, 0.2, 8), matSkin, 0.04); // Skin-colored calf
  meshRCalf.name = "calf";
  meshRCalf.position.y = -0.1;
  pivotRKnee.add(meshRCalf);

  // White sock at the bottom of calf
  const sockR = createToonMesh(THREE, new THREE.CylinderGeometry(0.082, 0.082, 0.08, 8), matWhite, 0.02);
  sockR.position.y = -0.12;
  meshRCalf.add(sockR);

  // Chunky Retro Sneaker
  const shoeRGroup = new THREE.Group();
  shoeRGroup.position.set(0, -0.2, 0.02);
  
  const soleR = createToonMesh(THREE, new THREE.BoxGeometry(0.14, 0.035, 0.22), matTeal, 0.01);
  soleR.position.y = -0.035;
  shoeRGroup.add(soleR);
  
  const bodyR = createToonMesh(THREE, new THREE.BoxGeometry(0.13, 0.08, 0.21), matWhite, 0.015);
  bodyR.position.y = 0.02;
  shoeRGroup.add(bodyR);
  
  const toeCapR = createToonMesh(THREE, new THREE.BoxGeometry(0.125, 0.04, 0.05), matCoat, 0.015);
  toeCapR.position.set(0, 0.01, 0.085);
  shoeRGroup.add(toeCapR);
  
  const heelCapR = createToonMesh(THREE, new THREE.BoxGeometry(0.125, 0.06, 0.04), matCoat, 0.015);
  heelCapR.position.set(0, 0.02, -0.09);
  shoeRGroup.add(heelCapR);
  
  const tongueR = createToonMesh(THREE, new THREE.BoxGeometry(0.09, 0.03, 0.1), matBlack, 0);
  tongueR.position.set(0, 0.065, 0.02);
  shoeRGroup.add(tongueR);

  meshRCalf.add(shoeRGroup);

  bodyGroup.add(pivotRLeg);

  // Add laptop accessory if builder tags match
  if (tags.includes("opensource") || tags.includes("webdev") || tags.includes("systems")) {
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(0.06, -0.12, 0.06);
    laptopGroup.rotation.set(0.2, -0.1, -0.2);
    
    const lapBase = createToonMesh(THREE, new THREE.BoxGeometry(0.16, 0.015, 0.12), matBlack, 0);
    const lapLogoMat = new THREE.MeshToonMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
    const lapLogo = createToonMesh(THREE, new THREE.BoxGeometry(0.03, 0.001, 0.03), lapLogoMat, 0);
    lapLogo.position.y = 0.008;
    laptopGroup.add(lapBase);
    laptopGroup.add(lapLogo);
    meshLArm.add(laptopGroup); // Tuck under left arm
  }

  // Scale the character slightly based on metadata
  const scale = options.scale || 0.85;
  group.scale.set(scale, scale, scale);

  return group;
}

export function animateCharacter(character, animState, time, speedMultiplier = 1) {
  const bodyGroup = character.getObjectByName("bodyGroup");
  const head = character.getObjectByName("head");
  const pivotLArm = character.getObjectByName("pivotLArm");
  const pivotRArm = character.getObjectByName("pivotRArm");
  const pivotLLeg = character.getObjectByName("pivotLLeg");
  const pivotRLeg = character.getObjectByName("pivotRLeg");

  const pivotLElbow = character.getObjectByName("pivotLElbow");
  const pivotRElbow = character.getObjectByName("pivotRElbow");
  const pivotLKnee = character.getObjectByName("pivotLKnee");
  const pivotRKnee = character.getObjectByName("pivotRKnee");

  if (!bodyGroup || !pivotLArm || !pivotRArm || !pivotLLeg || !pivotRLeg) return;

  const t = time * speedMultiplier;

  // Reset defaults
  bodyGroup.position.set(0, 0, 0);
  bodyGroup.rotation.set(0, 0, 0);
  if (head) head.rotation.set(0, 0, 0);
  
  pivotLArm.rotation.set(0, 0, -0.05);
  pivotRArm.rotation.set(0, 0, 0.05);
  pivotLLeg.rotation.set(0, 0, 0);
  pivotRLeg.rotation.set(0, 0, 0);

  if (pivotLElbow) pivotLElbow.rotation.set(0, 0, 0);
  if (pivotRElbow) pivotRElbow.rotation.set(0, 0, 0);
  if (pivotLKnee) pivotLKnee.rotation.set(0, 0, 0);
  if (pivotRKnee) pivotRKnee.rotation.set(0, 0, 0);

  switch (animState) {
    case "idle":
      // Breath bobbing
      bodyGroup.position.y = Math.sin(t * 2) * 0.015;
      
      pivotLArm.rotation.x = Math.sin(t * 2) * 0.03;
      pivotRArm.rotation.x = -Math.sin(t * 2) * 0.03;
      pivotLArm.rotation.z = -Math.abs(Math.sin(t * 1)) * 0.02 - 0.05;
      pivotRArm.rotation.z = Math.abs(Math.sin(t * 1)) * 0.02 + 0.05;

      // Natural slight elbow bend at rest
      if (pivotLElbow) pivotLElbow.rotation.x = 0.15;
      if (pivotRElbow) pivotRElbow.rotation.x = 0.15;
      break;

    case "walk":
      // Walking gait
      const swingW = Math.sin(t * 8);
      pivotLArm.rotation.x = swingW * 0.45;
      pivotRArm.rotation.x = -swingW * 0.45;
      pivotLLeg.rotation.x = -swingW * 0.45;
      pivotRLeg.rotation.x = swingW * 0.45;

      pivotLArm.rotation.z = -0.08;
      pivotRArm.rotation.z = 0.08;

      // Knee bending: bend when the leg goes backwards
      if (pivotLKnee) pivotLKnee.rotation.x = Math.max(0, -swingW) * 0.55;
      if (pivotRKnee) pivotRKnee.rotation.x = Math.max(0, swingW) * 0.55;

      // Natural walk elbow bending
      if (pivotLElbow) pivotLElbow.rotation.x = 0.3 + Math.sin(t * 8 - Math.PI / 2) * 0.08;
      if (pivotRElbow) pivotRElbow.rotation.x = 0.3 - Math.sin(t * 8 - Math.PI / 2) * 0.08;

      // Torso bobbing & leaning
      bodyGroup.position.y = Math.abs(Math.sin(t * 16)) * 0.04;
      bodyGroup.rotation.y = swingW * 0.05;
      bodyGroup.rotation.x = 0.04; // lean forward
      break;

    case "run":
      // Running gait (faster, higher angles)
      const swingR = Math.sin(t * 13);
      pivotLArm.rotation.x = swingR * 0.8;
      pivotRArm.rotation.x = -swingR * 0.8;
      pivotLLeg.rotation.x = -swingR * 0.7;
      pivotRLeg.rotation.x = swingR * 0.7;

      pivotLArm.rotation.z = -0.15;
      pivotRArm.rotation.z = 0.15;

      // Higher knee bend in run
      if (pivotLKnee) pivotLKnee.rotation.x = Math.max(0, -swingR) * 0.95;
      if (pivotRKnee) pivotRKnee.rotation.x = Math.max(0, swingR) * 0.95;

      // Running elbow bend (arms held higher and bent more)
      if (pivotLElbow) pivotLElbow.rotation.x = 0.65 + Math.sin(t * 13) * 0.12;
      if (pivotRElbow) pivotRElbow.rotation.x = 0.65 - Math.sin(t * 13) * 0.12;

      // Higher torso bobbing & leaning
      bodyGroup.position.y = Math.abs(Math.sin(t * 26)) * 0.08;
      bodyGroup.rotation.y = swingR * 0.08;
      bodyGroup.rotation.x = 0.12; // lean forward more
      break;

    case "wave":
      // Idle lower body, waving right arm
      bodyGroup.position.y = Math.sin(t * 2.5) * 0.015;
      
      pivotLArm.rotation.x = Math.sin(t * 2.5) * 0.03;
      pivotLArm.rotation.z = -0.05;
      if (pivotLElbow) pivotLElbow.rotation.x = 0.15;

      // Raise right arm up from shoulder
      pivotRArm.rotation.x = 0.1;
      pivotRArm.rotation.z = 1.4;
      
      // Wave from the elbow and forearm
      if (pivotRElbow) {
        pivotRElbow.rotation.x = 0.5;
        pivotRElbow.rotation.z = Math.sin(t * 14) * 0.35; // wave forearm left/right
      }
      break;

    case "celebrate":
      // Jumping up and down, raising arms
      const jump = Math.max(0, Math.sin(t * 11)) * 0.25;
      bodyGroup.position.y = jump;

      pivotLArm.rotation.x = 0.1;
      pivotRArm.rotation.x = 0.1;
      pivotLArm.rotation.z = -1.9 + Math.sin(t * 14) * 0.1;
      pivotRArm.rotation.z = 1.9 + Math.sin(t * 14) * 0.1;

      // Bends elbows slightly during jump
      if (pivotLElbow) pivotLElbow.rotation.x = 0.4;
      if (pivotRElbow) pivotRElbow.rotation.x = 0.4;

      // Bend knees slightly in mid-air
      if (jump > 0.05) {
        if (pivotLKnee) pivotLKnee.rotation.x = 0.4;
        if (pivotRKnee) pivotRKnee.rotation.x = 0.4;
      }
      break;

    case "sit":
      // Bend hips 90 degrees, lower body
      bodyGroup.position.y = -0.36;
      bodyGroup.position.z = -0.15; // Shift back onto chair seat

      pivotLArm.rotation.x = -Math.PI / 6;
      pivotRArm.rotation.x = -Math.PI / 6;
      pivotLArm.rotation.z = -0.05;
      pivotRArm.rotation.z = 0.05;

      if (pivotLElbow) pivotLElbow.rotation.x = 0.4;
      if (pivotRElbow) pivotRElbow.rotation.x = 0.4;

      // Hip bend 90 degrees
      pivotLLeg.rotation.x = -Math.PI / 2;
      pivotRLeg.rotation.x = -Math.PI / 2;
      pivotLLeg.rotation.y = 0.05;
      pivotRLeg.rotation.y = -0.05;

      // Knee bend 90 degrees
      if (pivotLKnee) pivotLKnee.rotation.x = Math.PI / 2;
      if (pivotRKnee) pivotRKnee.rotation.x = Math.PI / 2;
      break;

    default:
      // Stand idle
      pivotLArm.rotation.set(0, 0, 0);
      pivotRArm.rotation.set(0, 0, 0);
      pivotLLeg.rotation.set(0, 0, 0);
      pivotRLeg.rotation.set(0, 0, 0);
  }
}

// Utility: seedable pseudo-random helper
function seeded(value, salt = 0) {
  let hash = 2166136261 + salt * 101;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return ((hash >>> 0) % 10000) / 10000;
}

function pickColor(val, list) {
  const normalized = ((val % 1) + 1) % 1;
  const idx = Math.floor(normalized * list.length);
  return list[idx];
}
