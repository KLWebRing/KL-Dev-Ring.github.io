/**
 * character.js - Procedural Character Generation & Animation Engine (CharacterGen)
 * Generates low-poly characters from developer metadata (styling, clothing, accessories)
 * and animates them using trigonometric procedural keyframing.
 */

export function createCharacter(THREE, options = {}) {
  const group = new THREE.Group();
  group.name = "character";

  // Deterministic random styling based on builder handle
  const seed = seeded(options.handle || "player", 42);
  const hairColor = options.hairColor || pickColor(seed, ["#1a1a1a", "#4a3728", "#b08d57", "#c45c3b", "#3b5ba5", "#5ba53b"]);
  const shirtColor = options.shirtColor || pickColor(seed + 0.1, ["#ee5a43", "#ffb31a", "#7ad8a6", "#3b82f6", "#8b5cf6", "#ec4899"]);
  const pantsColor = options.pantsColor || pickColor(seed + 0.2, ["#1f2937", "#374151", "#4b5563", "#1e3a8a", "#064e3b"]);
  const skinColor = options.skinColor || pickColor(seed + 0.3, ["#fcd34d", "#fca5a5", "#f59e0b", "#d97706", "#b45309", "#854d0e"]);
  const shoeColor = "#111111";

  // Primary materials
  const matSkin = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
  const matShirt = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
  const matPants = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
  const matHair = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.9 });
  const matShoes = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.8 });
  const matBlack = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

  // Body container (for overall character scale/bobbing)
  const bodyGroup = new THREE.Group();
  bodyGroup.name = "bodyGroup";
  group.add(bodyGroup);

  // Torso
  const geoTorso = new THREE.BoxGeometry(0.5, 0.7, 0.3);
  const torso = new THREE.Mesh(geoTorso, matShirt);
  torso.name = "torso";
  torso.position.y = 0.55;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyGroup.add(torso);

  // Head
  const geoHead = new THREE.BoxGeometry(0.4, 0.4, 0.4);
  const head = new THREE.Mesh(geoHead, matSkin);
  head.name = "head";
  head.position.y = 1.1;
  head.castShadow = true;
  bodyGroup.add(head);

  // Eyes (Two small dark squares)
  const geoEye = new THREE.BoxGeometry(0.06, 0.06, 0.02);
  const eyeL = new THREE.Mesh(geoEye, matBlack);
  eyeL.position.set(-0.1, 0.05, 0.201);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  head.add(eyeL);
  head.add(eyeR);

  // Hair / Hairstyle
  const hairGroup = new THREE.Group();
  hairGroup.name = "hair";
  head.add(hairGroup);

  const styleSeed = seeded(options.handle || "player", 99);
  if (styleSeed < 0.25) {
    // Spiky Hair
    const geoSpike = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    for (let x = -0.22; x <= 0.22; x += 0.11) {
      for (let z = -0.22; z <= 0.22; z += 0.11) {
        if (Math.random() > 0.3) {
          const spike = new THREE.Mesh(geoSpike, matHair);
          spike.position.set(x, 0.2, z);
          spike.rotation.set(Math.random() * 0.4 - 0.2, 0, Math.random() * 0.4 - 0.2);
          hairGroup.add(spike);
        }
      }
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.44), matHair);
    cap.position.y = 0.18;
    hairGroup.add(cap);
  } else if (styleSeed < 0.5) {
    // Cap / Beanie
    const beanie = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.22, 0.44), matHair);
    beanie.position.y = 0.2;
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.15), matHair);
    brim.position.set(0, 0.1, 0.28);
    hairGroup.add(beanie);
    hairGroup.add(brim);
  } else if (styleSeed < 0.75) {
    // Long hair / Sides
    const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.15, 0.44), matHair);
    topHair.position.y = 0.2;
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.35, 0.44), matHair);
    sideL.position.set(-0.21, -0.05, 0);
    const sideR = sideL.clone();
    sideR.position.x = 0.21;
    hairGroup.add(topHair);
    hairGroup.add(sideL);
    hairGroup.add(sideR);
  } else {
    // Afro / Curly top
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), matHair);
    afro.position.y = 0.2;
    afro.scale.set(1.0, 0.8, 1.0);
    hairGroup.add(afro);
  }

  // Accessories based on Tags / Craft
  const tags = options.tags || [];
  if (tags.includes("ai") || tags.includes("research") || styleSeed > 0.85) {
    // Cyber Glasses / Visor
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, roughness: 0.1 });
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.05), visorMat);
    visor.position.set(0, 0.05, 0.21);
    head.add(visor);
  } else if (tags.includes("systems") || tags.includes("fullstack") || styleSeed < 0.15) {
    // Headphones
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
    const phoneMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.7 });
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 0.1), bandMat);
    band.position.y = 0.22;
    const phoneL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.18), phoneMat);
    phoneL.position.set(-0.22, 0.05, 0);
    const phoneR = phoneL.clone();
    phoneR.position.x = 0.22;
    head.add(band);
    head.add(phoneL);
    head.add(phoneR);
  }

  // Pivots for limbs
  // Arms
  const pivotLArm = new THREE.Group();
  pivotLArm.name = "pivotLArm";
  pivotLArm.position.set(-0.35, 0.8, 0);
  const meshLArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), matShirt);
  meshLArm.position.y = -0.2;
  meshLArm.castShadow = true;
  const handL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), matSkin);
  handL.position.y = -0.48;
  meshLArm.add(handL);
  pivotLArm.add(meshLArm);
  bodyGroup.add(pivotLArm);

  const pivotRArm = new THREE.Group();
  pivotRArm.name = "pivotRArm";
  pivotRArm.position.set(0.35, 0.8, 0);
  const meshRArm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), matShirt);
  meshRArm.position.y = -0.2;
  meshRArm.castShadow = true;
  const handR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.12), matSkin);
  handR.position.y = -0.48;
  meshRArm.add(handR);
  pivotRArm.add(meshRArm);
  bodyGroup.add(pivotRArm);

  // Legs
  const pivotLLeg = new THREE.Group();
  pivotLLeg.name = "pivotLLeg";
  pivotLLeg.position.set(-0.16, 0.25, 0);
  const meshLLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.16), matPants);
  meshLLeg.position.y = -0.15;
  meshLLeg.castShadow = true;
  const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.24), matShoes);
  shoeL.position.set(0, -0.38, 0.03);
  meshLLeg.add(shoeL);
  pivotLLeg.add(meshLLeg);
  bodyGroup.add(pivotLLeg);

  const pivotRLeg = new THREE.Group();
  pivotRLeg.name = "pivotRLeg";
  pivotRLeg.position.set(0.16, 0.25, 0);
  const meshRLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.16), matPants);
  meshRLeg.position.y = -0.15;
  meshRLeg.castShadow = true;
  const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.08, 0.24), matShoes);
  shoeR.position.set(0, -0.38, 0.03);
  meshRLeg.add(shoeR);
  pivotRLeg.add(meshRLeg);
  bodyGroup.add(pivotRLeg);

  // Add laptop accessory if builder
  if (tags.includes("opensource") || tags.includes("webdev") || tags.includes("systems")) {
    const laptopGroup = new THREE.Group();
    laptopGroup.position.set(0.1, -0.2, 0.1);
    laptopGroup.rotation.set(0.2, -0.1, -0.2);
    const lapBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.16), matBlack);
    const lapLogoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, roughness: 0.1 });
    const lapLogo = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.002, 0.04), lapLogoMat);
    lapLogo.position.y = 0.011;
    laptopGroup.add(lapBase);
    laptopGroup.add(lapLogo);
    meshLArm.add(laptopGroup); // Tuck under left arm
  }

  // Scale the character slightly based on metadata or default
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

  if (!bodyGroup || !pivotLArm || !pivotRArm || !pivotLLeg || !pivotRLeg) return;

  const t = time * speedMultiplier;

  // Reset defaults
  bodyGroup.position.set(0, 0, 0);
  bodyGroup.rotation.set(0, 0, 0);
  if (head) head.rotation.set(0, 0, 0);

  switch (animState) {
    case "idle":
      // Breath bobbing
      bodyGroup.position.y = Math.sin(t * 2) * 0.015;
      pivotLArm.rotation.x = Math.sin(t * 2) * 0.03;
      pivotRArm.rotation.x = -Math.sin(t * 2) * 0.03;
      pivotLArm.rotation.z = -Math.abs(Math.sin(t * 1)) * 0.02 - 0.05;
      pivotRArm.rotation.z = Math.abs(Math.sin(t * 1)) * 0.02 + 0.05;
      pivotLLeg.rotation.x = 0;
      pivotRLeg.rotation.x = 0;
      break;

    case "walk":
      // Walking gait
      pivotLArm.rotation.x = Math.sin(t * 8) * 0.45;
      pivotRArm.rotation.x = -Math.sin(t * 8) * 0.45;
      pivotLLeg.rotation.x = -Math.sin(t * 8) * 0.45;
      pivotRLeg.rotation.x = Math.sin(t * 8) * 0.45;

      pivotLArm.rotation.z = -0.08;
      pivotRArm.rotation.z = 0.08;

      // Torso bobbing
      bodyGroup.position.y = Math.abs(Math.sin(t * 16)) * 0.04;
      bodyGroup.rotation.y = Math.sin(t * 8) * 0.05;
      bodyGroup.rotation.x = 0.04; // lean forward
      break;

    case "run":
      // Running gait (faster, higher angles)
      pivotLArm.rotation.x = Math.sin(t * 13) * 0.8;
      pivotRArm.rotation.x = -Math.sin(t * 13) * 0.8;
      pivotLLeg.rotation.x = -Math.sin(t * 13) * 0.7;
      pivotRLeg.rotation.x = Math.sin(t * 13) * 0.7;

      pivotLArm.rotation.z = -0.15;
      pivotRArm.rotation.z = 0.15;

      // Higher torso bobbing
      bodyGroup.position.y = Math.abs(Math.sin(t * 26)) * 0.08;
      bodyGroup.rotation.y = Math.sin(t * 13) * 0.08;
      bodyGroup.rotation.x = 0.12; // lean forward more
      break;

    case "wave":
      // Idle lower body, waving right hand
      bodyGroup.position.y = Math.sin(t * 2.5) * 0.015;
      pivotLArm.rotation.x = Math.sin(t * 2.5) * 0.03;
      pivotLArm.rotation.z = -0.05;

      // Wave arm
      pivotRArm.rotation.x = 0;
      pivotRArm.rotation.z = 2.0 + Math.sin(t * 14) * 0.25;

      pivotLLeg.rotation.x = 0;
      pivotRLeg.rotation.x = 0;
      break;

    case "celebrate":
      // Jumping up and down, raising arms
      const jump = Math.max(0, Math.sin(t * 11)) * 0.25;
      bodyGroup.position.y = jump;

      pivotLArm.rotation.x = 0;
      pivotRArm.rotation.x = 0;
      pivotLArm.rotation.z = -2.2 + Math.sin(t * 14) * 0.15;
      pivotRArm.rotation.z = 2.2 + Math.sin(t * 14) * 0.15;

      pivotLLeg.rotation.x = jump > 0.05 ? -0.15 : 0;
      pivotRLeg.rotation.x = jump > 0.05 ? -0.15 : 0;
      break;

    case "sit":
      // Bend hips 90 degrees, lower body
      bodyGroup.position.y = -0.36;
      bodyGroup.position.z = -0.15; // Shift back onto chair seat

      pivotLArm.rotation.x = -Math.PI / 4;
      pivotRArm.rotation.x = -Math.PI / 4;
      pivotLArm.rotation.z = -0.05;
      pivotRArm.rotation.z = 0.05;

      pivotLLeg.rotation.x = -Math.PI / 2;
      pivotRLeg.rotation.x = -Math.PI / 2;
      pivotLLeg.rotation.y = 0.05;
      pivotRLeg.rotation.y = -0.05;
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
  const idx = Math.floor(val * list.length);
  return list[idx];
}
