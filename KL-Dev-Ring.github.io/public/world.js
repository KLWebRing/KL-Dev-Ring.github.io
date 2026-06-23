/**
 * world.js - Core 3D Town Engine, Controls, Physics, and Layout Manager
 * Handles the Three.js scene loop, third-person player controller, collisions,
 * procedural street decoration, day/night cycles, and interactive state triggers.
 */

import { createCharacter, animateCharacter } from "./character.js";
import { createHouse, createInterior, animateInterior, getBuilderInterest } from "./house.js";

export function initWorld(THREE, container, members, onInteract) {
  let scene, camera, renderer;
  let player, playerController;
  let structures = []; // collision objects
  let interactables = []; // interactive items (noticeboard, mailboxes, doors)
  let residents = []; // resident npc characters
  let podiumCharacters = []; // weekly top builders on podiums
  let streetlights = [];
  let dayNightCycle = { time: 0, sunLight: null, ambientLight: null };

  // Current view state: 'town' or 'workshop'
  let currentViewState = "town"; // 'town' or 'workshop'
  let activeWorkshop = null; // { group, member, styleType }

  // Game loop state
  let clock = new THREE.Clock();
  let animationFrameId;

  // Interaction message HUD element
  const interactionPrompt = document.getElementById("interactionPrompt");

  // ── 1. SETUP THREE.JS ──────────────────────────────────────────────────
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb8e3fc);
  scene.fog = new THREE.FogExp2(0xb8e3fc, 0.004);

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 5, 14);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  // ── 2. LIGHTING & DAY/NIGHT CYCLE ──────────────────────────────────────
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambient);
  dayNightCycle.ambientLight = ambient;

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
  sun.position.set(20, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 170;
  const d = 50;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  dayNightCycle.sunLight = sun;

  // ── 3. ROAD & GROUND GENERATION ────────────────────────────────────────
  function createGround() {
    // Large ground plane
    const floorGeo = new THREE.PlaneGeometry(350, 350);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0c0b, roughness: 0.95 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Center Plaza asphalt circle
    const plazaGeo = new THREE.CircleGeometry(16, 32);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0x181a1b, roughness: 0.9 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.01;
    plaza.receiveShadow = true;
    scene.add(plaza);

    // Main Roads
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x121314, roughness: 0.9 });
    
    // South Road (lending to neighborhood and Hall of Fame) - extended to 180 units
    const roadSouth = new THREE.Mesh(new THREE.PlaneGeometry(6, 180), roadMat);
    roadSouth.rotation.x = -Math.PI / 2;
    roadSouth.position.set(0, 0.015, 106);
    roadSouth.receiveShadow = true;
    scene.add(roadSouth);

    // East Road (leading to Cafe)
    const roadEast = new THREE.Mesh(new THREE.PlaneGeometry(50, 5), roadMat);
    roadEast.rotation.x = -Math.PI / 2;
    roadEast.position.set(41, 0.015, 0);
    roadEast.receiveShadow = true;
    scene.add(roadEast);

    // West Road (leading to Garage & Hub)
    const roadWest = roadEast.clone();
    roadWest.position.x = -41;
    scene.add(roadWest);

    // Sidewalks & Curbs
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x242627, roughness: 0.85 });
    
    // South Road Sidewalks (left and right of road) - extended to 180 units
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 180), sidewalkMat);
    swLeft.position.set(3.6, 0.05, 106);
    swLeft.castShadow = true;
    swLeft.receiveShadow = true;
    scene.add(swLeft);

    const swRight = swLeft.clone();
    swRight.position.x = -3.6;
    scene.add(swRight);

    // Crosswalks on South Road near Plaza
    const crosswalkMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.9 });
    for (let offset = 0; offset < 5; offset++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 4), crosswalkMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-2 + offset * 1, 0.02, 18);
      scene.add(stripe);
    }
  }
  createGround();

  // ── 4. PLAYER CONTROLLER ───────────────────────────────────────────────
  class PlayerController {
    constructor() {
      this.mesh = createCharacter(THREE, { handle: "player", shirtColor: "#ffb31a", tags: ["ai", "webdev"] });
      this.mesh.position.set(0, 0, 10); // Spawn near plaza notice board
      scene.add(this.mesh);

      this.moveDirection = new THREE.Vector3();
      this.velocity = new THREE.Vector3();
      this.gravity = -22;
      this.jumpForce = 7.5;
      this.isGrounded = true;

      this.moveSpeed = 3.6;
      this.runSpeed = 6.4;

      this.animState = "idle";
      this.time = 0;

      // Third-person camera orbit variables
      this.yaw = 0;
      this.pitch = -0.25;
      this.cameraDistance = 6.0;

      this.keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
      this.setupControls();
    }

    setupControls() {
      window.addEventListener("keydown", (e) => {
        if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
        const key = e.key.toLowerCase();
        if (key === "w" || e.key === "ArrowUp") this.keys.w = true;
        if (key === "s" || e.key === "ArrowDown") this.keys.s = true;
        if (key === "a" || e.key === "ArrowLeft") this.keys.a = true;
        if (key === "d" || e.key === "ArrowRight") this.keys.d = true;
        if (key === "shift") this.keys.shift = true;
        if (key === " ") {
          this.keys.space = true;
          e.preventDefault();
        }
        
        // Emote keys
        if (key === "1") this.triggerEmote("wave");
        if (key === "2") this.triggerEmote("celebrate");
      });

      window.addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        if (key === "w" || e.key === "ArrowUp") this.keys.w = false;
        if (key === "s" || e.key === "ArrowDown") this.keys.s = false;
        if (key === "a" || e.key === "ArrowLeft") this.keys.a = false;
        if (key === "d" || e.key === "ArrowRight") this.keys.d = false;
        if (key === "shift") this.keys.shift = false;
        if (key === " ") this.keys.space = false;
      });

      // Mouse drag controls camera yaw/pitch
      let isDragging = false;
      let prevMouseX = 0;
      let prevMouseY = 0;

      container.addEventListener("mousedown", (e) => {
        isDragging = true;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      });

      window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        this.yaw -= deltaX * 0.007;
        this.pitch = Math.max(-0.6, Math.min(0.2, this.pitch - deltaY * 0.005));
      });

      window.addEventListener("mouseup", () => {
        isDragging = false;
      });
      
      // Touch support for camera orbiting
      let prevTouchX = 0;
      let prevTouchY = 0;
      container.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
          prevTouchX = e.touches[0].clientX;
          prevTouchY = e.touches[0].clientY;
        }
      });
      container.addEventListener("touchmove", (e) => {
        if (e.touches.length === 1) {
          const deltaX = e.touches[0].clientX - prevTouchX;
          const deltaY = e.touches[0].clientY - prevTouchY;
          prevTouchX = e.touches[0].clientX;
          prevTouchY = e.touches[0].clientY;
          
          this.yaw -= deltaX * 0.01;
          this.pitch = Math.max(-0.6, Math.min(0.2, this.pitch - deltaY * 0.008));
        }
      });
    }

    triggerEmote(emote) {
      if (this.animState === "walk" || this.animState === "run") return;
      this.animState = emote;
      setTimeout(() => {
        if (this.animState === emote) this.animState = "idle";
      }, 2000);
    }

    update(dt) {
      this.time += dt;

      // 1. Calculate movement relative to camera angle
      const camForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).normalize();
      const camRight = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw).normalize();

      this.moveDirection.set(0, 0, 0);
      if (this.keys.w) this.moveDirection.add(camForward);
      if (this.keys.s) this.moveDirection.sub(camForward);
      if (this.keys.a) this.moveDirection.sub(camRight);
      if (this.keys.d) this.moveDirection.add(camRight);

      const isMoving = this.moveDirection.lengthSq() > 0;
      if (isMoving) {
        this.moveDirection.normalize();
        this.animState = this.keys.shift ? "run" : "walk";
        
        // Rotate character mesh towards movement direction
        const targetAngle = Math.atan2(this.moveDirection.x, this.moveDirection.z);
        // Smooth rotation
        let angleDiff = targetAngle - this.mesh.rotation.y;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        this.mesh.rotation.y += angleDiff * 0.15;
      } else if (this.animState === "walk" || this.animState === "run") {
        this.animState = "idle";
      }

      // 2. Physics & Jump
      const currentSpeed = this.keys.shift ? this.runSpeed : this.moveSpeed;
      this.velocity.x = isMoving ? this.moveDirection.x * currentSpeed : 0;
      this.velocity.z = isMoving ? this.moveDirection.z * currentSpeed : 0;

      if (!this.isGrounded) {
        this.velocity.y += this.gravity * dt;
      } else if (this.keys.space) {
        this.velocity.y = this.jumpForce;
        this.isGrounded = false;
      } else {
        this.velocity.y = 0;
      }

      // Apply velocity & Simple Collisions
      const prevPos = this.mesh.position.clone();
      this.mesh.position.addScaledVector(this.velocity, dt);

      // Simple cylinder collider check (radius 0.4)
      for (const col of structures) {
        const dx = this.mesh.position.x - col.x;
        const dz = this.mesh.position.z - col.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = col.radius + 0.45;
        if (dist < minDist) {
          // Push player back
          const angle = Math.atan2(dx, dz);
          this.mesh.position.x = col.x + Math.sin(angle) * minDist;
          this.mesh.position.z = col.z + Math.cos(angle) * minDist;
        }
      }

      // Keep inside bounds
      this.mesh.position.x = Math.max(-120, Math.min(120, this.mesh.position.x));
      this.mesh.position.z = Math.max(-15, Math.min(178, this.mesh.position.z));

      // Ground check (flat level at y = 0)
      if (this.mesh.position.y <= 0) {
        this.mesh.position.y = 0;
        this.isGrounded = true;
      }

      // 3. Animate Mesh limbs
      animateCharacter(this.mesh, this.animState, this.time, this.keys.shift ? 1.6 : 1.0);

      // 4. Update Camera placement
      const targetOffset = new THREE.Vector3(0, 0, this.cameraDistance)
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

      const lookTarget = new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 1.2, this.mesh.position.z);
      const targetCamPos = lookTarget.clone().add(targetOffset);

      camera.position.lerp(targetCamPos, 0.12);
      camera.lookAt(lookTarget);
    }
  }

  // ── 5. CORE BUILDINGS & PLAZA ──────────────────────────────────────────
  function createFountain() {
    const fGroup = new THREE.Group();
    fGroup.position.set(0, 0, 0);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }));
    base.position.y = 0.25;
    base.castShadow = true;
    base.receiveShadow = true;
    fGroup.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.8, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 }));
    pillar.position.y = 1.15;
    pillar.castShadow = true;
    fGroup.add(pillar);

    // Water surface
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, opacity: 0.6, transparent: true }));
    water.position.y = 0.46;
    fGroup.add(water);

    // Splashing droplets group
    const drops = new THREE.Group();
    drops.name = "waterDrops";
    for (let i = 0; i < 15; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.06 + Math.random() * 0.04, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.8 })
      );
      // Random coordinates around pillar top
      const angle = (i / 15) * Math.PI * 2;
      drop.position.set(Math.sin(angle) * 0.5, 2.1, Math.cos(angle) * 0.5);
      drop.userData = { speed: 2 + Math.random() * 2, offset: Math.random() * 10, radius: 0.3 + Math.random() * 0.5, angle };
      drops.add(drop);
    }
    fGroup.add(drops);
    scene.add(fGroup);

    structures.push({ x: 0, z: 0, radius: 2.5 });
  }

  function createNoticeBoard() {
    const matWood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const matPaper = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.9 });

    const board = new THREE.Group();
    board.position.set(0, 0, 7.5); // Facing south

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), matWood);
    postL.position.set(-1.2, 1.2, 0);
    postL.castShadow = true;
    const postR = postL.clone();
    postR.position.x = 1.2;
    board.add(postL, postR);

    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 0.15), matWood);
    frame.position.y = 1.8;
    frame.castShadow = true;
    board.add(frame);

    // Paper noticeboard plane
    const paper = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.15, 0.06), matPaper);
    paper.position.set(0, 1.8, 0.05);
    board.add(paper);

    // Little paper post-its
    const noteColors = [0xf43f5e, 0x3b82f6, 0x10b981, 0xeab308];
    for (let i = 0; i < 4; i++) {
      const note = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.01),
        new THREE.MeshStandardMaterial({ color: noteColors[i], roughness: 0.9 })
      );
      note.position.set(-0.8 + i * 0.5, 1.8 + (Math.sin(i) * 0.2), 0.09);
      note.rotation.z = Math.sin(i) * 0.15;
      board.add(note);
    }

    scene.add(board);
    structures.push({ x: 0, z: 7.5, radius: 1.0 });

    interactables.push({
      x: 0, z: 8.8, radius: 1.6,
      message: "Press [E] to read Community Board",
      action: () => onInteract({ type: "chat" })
    });
  }

  function createTownHall() {
    const tGroup = new THREE.Group();
    tGroup.position.set(0, 0, -22);

    const matBricks = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.85 }); // dark gray brick facade
    const matPillars = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.8 }); // white concrete pillars
    const matGold = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xd97706, emissiveIntensity: 0.2 });
    const matBlack = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.8 });

    // Main hall base block
    const base = new THREE.Mesh(new THREE.BoxGeometry(16, 5.5, 8), matBricks);
    base.position.y = 2.75;
    base.castShadow = true;
    base.receiveShadow = true;
    tGroup.add(base);

    // Neoclassical Triangular roof top
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9.2, 2.5, 4), matPillars);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.0, 1.0, 0.5);
    roof.position.set(0, 6.75, 0);
    roof.castShadow = true;
    tGroup.add(roof);

    // Front Pillars
    for (let x = -7; x <= 7; x += 3.5) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.0, 8), matPillars);
      pillar.position.set(x, 2.5, 4.2);
      pillar.castShadow = true;
      tGroup.add(pillar);
    }

    // Leaderboard Plaque in front
    const plaqueGroup = new THREE.Group();
    plaqueGroup.position.set(0, 0, 7.0);

    const pBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 1.0), matPillars);
    pBase.position.y = 0.1;
    pBase.castShadow = true;
    plaqueGroup.add(pBase);

    const pPillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 0.3), matPillars);
    pPillar.position.y = 0.85;
    pPillar.castShadow = true;
    plaqueGroup.add(pPillar);

    const pScreen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 0.15), matBlack);
    pScreen.position.y = 1.6;
    pScreen.castShadow = true;
    
    // Glowing neon frame
    const pGlow = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.98, 0.05), matGold);
    pGlow.position.set(0, 1.6, 0.07);
    plaqueGroup.add(pScreen, pGlow);
    tGroup.add(plaqueGroup);

    scene.add(tGroup);
    structures.push({ x: 0, z: -22, radius: 8.5 });
    structures.push({ x: 0, z: -15, radius: 1.2 }); // Plaque collision

    interactables.push({
      x: 0, z: -13.5, radius: 1.8,
      message: "Press [E] to read Town Hall Leaderboard",
      action: () => onInteract({ type: "leaderboard" })
    });
  }

  function createCodeCafe() {
    const groupCafe = new THREE.Group();
    groupCafe.position.set(22, 0, -3);

    const matWood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const matWalls = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.9 }); // reddish brick
    const matCanopy = new THREE.MeshStandardMaterial({ color: 0xee5a43, roughness: 0.7 }); // orange canopy
    const matCanopyWhite = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.7 });

    // Cafe building block
    const cafe = new THREE.Mesh(new THREE.BoxGeometry(8, 4.5, 6), matWalls);
    cafe.position.y = 2.25;
    cafe.castShadow = true;
    cafe.receiveShadow = true;
    groupCafe.add(cafe);

    // Striped Canopy
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 3.2, 3.1);
    canopyGroup.rotation.x = 0.35;
    for (let i = 0; i < 8; i++) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.08, 1.2), 
        i % 2 === 0 ? matCanopy : matCanopyWhite
      );
      stripe.position.x = -3.15 + i * 0.9;
      canopyGroup.add(stripe);
    }
    groupCafe.add(canopyGroup);

    // Outdoor seating tables
    const tableMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.5 });
    for (let xOffset = -2; xOffset <= 2; xOffset += 4) {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(xOffset, 0, 4.5);
      
      const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), matWood);
      tLeg.position.y = 0.4;
      const tTop = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.06, 8), tableMat);
      tTop.position.y = 0.83;
      tTop.castShadow = true;
      tableGroup.add(tLeg, tTop);

      // Stools around table
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
        const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.5, 8), matWood);
        stool.position.set(Math.sin(angle) * 0.8, 0.25, Math.cos(angle) * 0.8);
        stool.castShadow = true;
        tableGroup.add(stool);
      }
      groupCafe.add(tableGroup);
    }

    scene.add(groupCafe);
    structures.push({ x: 22, z: -3, radius: 5.0 });
  }

  // ── 6. NEIGHBORHOOD GENERATION ─────────────────────────────────────────
  function generateNeighborhood() {
    // We space builder houses along the South Road (x = 0).
    const startZ = 28;
    const spacing = 22; // spacing between houses

    members.forEach((member, index) => {
      const isLeft = index % 2 === 0;
      const row = Math.floor(index / 2);
      const plotX = isLeft ? 15 : -15;
      const plotZ = startZ + row * spacing;

      // Create House exterior Group
      const houseGroup = createHouse(THREE, {
        handle: member.handle,
        hue: member.hue,
        tags: member.tags
      });
      houseGroup.position.set(plotX, 0, plotZ);
      scene.add(houseGroup);

      // Add collisions
      structures.push({ x: plotX, z: plotZ - 2.0, radius: 4.5 }); // Main House Collision
      structures.push({ x: plotX + (isLeft ? 3.0 : -3.0), z: plotZ - 2.0, radius: 3.0 }); // Workshop Collision

      // ── Mailbox interaction ──
      const mailX = plotX + 1.4;
      const mailZ = plotZ + 8.2;
      interactables.push({
        x: mailX, z: mailZ, radius: 1.6,
        message: `Press [E] to view ${member.name}'s Passport`,
        action: () => onInteract({ type: "passport", member: member })
      });

      // ── Workshop Door interaction ──
      const shopDoorX = plotX + 5.15;
      const shopDoorZ = plotZ + 0.4;
      interactables.push({
        x: shopDoorX, z: shopDoorZ, radius: 1.8,
        message: `Press [E] to enter ${member.name}'s Workshop`,
        action: () => triggerEnterWorkshop(member)
      });

      // ── Resident NPC Character ──
      const resG = createCharacter(THREE, {
        handle: member.handle,
        tags: member.tags
      });
      const npcX = plotX - 2.0;
      const npcZ = plotZ + 6.0;
      resG.position.set(npcX, 0, npcZ);
      resG.rotation.y = Math.PI;
      scene.add(resG);

      // Register Resident as interactable too
      interactables.push({
        x: npcX, z: npcZ, radius: 1.6,
        message: `Press [E] to chat with ${member.name}`,
        action: () => onInteract({ type: "passport", member: member })
      });

      residents.push({
        mesh: resG,
        originX: npcX,
        originZ: npcZ,
        animState: "idle",
        time: Math.random() * 100,
        member: member
      });
    });
  }
  generateNeighborhood();

  // ── 7. STREETLIGHTS & DECORATIONS ──────────────────────────────────────
  function createStreetlights() {
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.7 });
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfffcd3, emissive: 0xfffcd3, emissiveIntensity: 1.0 });

    const spacing = 44;
    // Walk down the South Road sidewalks - extended z limit to 170
    for (let z = 24; z < 170; z += spacing) {
      // Left streetlight
      const slL = new THREE.Group();
      slL.position.set(3.4, 0, z);
      
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), lightMat);
      post.position.y = 1.7;
      post.castShadow = true;
      slL.add(post);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.08), lightMat);
      arm.position.set(-0.25, 3.4, 0);
      slL.add(arm);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), bulbMat);
      bulb.position.set(-0.5, 3.32, 0);
      slL.add(bulb);

      // SpotLight projecting downwards
      const spot = new THREE.SpotLight(0xfff1b5, 1.5, 15, Math.PI / 4, 0.6, 1.0);
      spot.position.set(-0.5, 3.3, 0);
      spot.target.position.set(-0.5, 0, 0);
      spot.castShadow = true;
      spot.shadow.bias = -0.001;
      slL.add(spot);
      slL.add(spot.target);

      scene.add(slL);
      streetlights.push(spot);

      // Right streetlight
      const slR = slL.clone();
      slR.position.x = -3.4;
      slR.children[1].position.x = 0.25;
      slR.children[2].position.x = 0.5;
      slR.children[3].position.x = 0.5;
      slR.children[3].target.position.x = 0.5;
      scene.add(slR);
      
      const clonedSpot = slR.children.find(c => c.isSpotLight);
      if (clonedSpot) streetlights.push(clonedSpot);
    }
  }
  createStreetlights();

  // Decorative trees around the plaza
  function createPlazaDecorations() {
    const matWood = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.95 });

    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      if (Math.abs(Math.sin(angle)) < 0.2) continue;

      const px = Math.sin(angle) * 19;
      const pz = Math.cos(angle) * 19;

      const tree = new THREE.Group();
      tree.position.set(px, 0, pz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.0, 8), matWood);
      trunk.position.y = 1.0;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9), leafMat);
      foliage.position.y = 2.0;
      foliage.castShadow = true;
      tree.add(foliage);

      scene.add(tree);
      structures.push({ x: px, z: pz, radius: 0.8 });
    }
  }
  createPlazaDecorations();

  // ── 8. HALL OF FAME ────────────────────────────────────────────────────
  function createHallOfFame() {
    const hofGroup = new THREE.Group();
    hofGroup.position.set(0, 0, 162);

    const matWalls = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.85 }); // White concrete
    const matRoof = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 }); // Red roof tiles
    const matColumns = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.8 }); // Light gray pillars
    const matGold = new THREE.MeshStandardMaterial({ color: 0xd97706, emissive: 0xd97706, emissiveIntensity: 0.3 });
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.5 });
    const matBanner = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 }); // Red banners

    // Steps leading up
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 6), matColumns);
    step1.position.set(0, 0.125, -6);
    step1.castShadow = true;
    step1.receiveShadow = true;
    hofGroup.add(step1);

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(12, 0.25, 4), matColumns);
    step2.position.set(0, 0.375, -5);
    step2.castShadow = true;
    step2.receiveShadow = true;
    hofGroup.add(step2);

    const step3 = new THREE.Mesh(new THREE.BoxGeometry(8, 0.25, 2), matColumns);
    step3.position.set(0, 0.625, -4);
    step3.castShadow = true;
    step3.receiveShadow = true;
    hofGroup.add(step3);

    // Main hall block
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 6.5, 10), matWalls);
    base.position.set(0, 3.25, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    hofGroup.add(base);

    // Columns
    for (let x = -8; x <= 8; x += 5.3) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 6.0, 8), matColumns);
      col.position.set(x, 3.0, 5.1);
      col.castShadow = true;
      hofGroup.add(col);
    }

    // Triangular Pediment Roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(14, 3.0, 4), matRoof);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.0, 1.0, 0.45);
    roof.position.set(0, 8.0, 0);
    roof.castShadow = true;
    hofGroup.add(roof);

    // Tower / Clock Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 6), matWalls);
    tower.position.set(0, 8.25, 0);
    tower.castShadow = true;
    hofGroup.add(tower);

    const tRoof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 2.0, 4), matRoof);
    tRoof.rotation.y = Math.PI / 4;
    tRoof.position.set(0, 11.0, 0);
    tRoof.castShadow = true;
    hofGroup.add(tRoof);

    // Clock Face
    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }));
    clockFace.rotation.x = Math.PI / 2;
    clockFace.position.set(0, 8.5, 3.05);
    clockFace.castShadow = true;
    hofGroup.add(clockFace);

    // Clock Hands
    const handH = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.02), matMetal);
    handH.position.set(0, 8.7, 3.12);
    const handM = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.02), matMetal);
    handM.position.set(0.2, 8.5, 3.12);
    handM.rotation.z = -Math.PI / 3;
    hofGroup.add(handH, handM);

    // Banners on building sides
    const leftBanner = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4.0, 0.05), matBanner);
    leftBanner.position.set(-6, 3.5, 5.15);
    leftBanner.castShadow = true;
    hofGroup.add(leftBanner);

    const rightBanner = leftBanner.clone();
    rightBanner.position.x = 6;
    hofGroup.add(rightBanner);

    // "HALL OF FAME" golden sign in center
    const sign = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 0.1), matGold);
    sign.position.set(0, 5.2, 5.12);
    hofGroup.add(sign);

    scene.add(hofGroup);
    structures.push({ x: 0, z: 162, radius: 11.0 });

    // ── Podiums ──
    const podiumZ = 146;

    // Gold (Center)
    const goldP = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.2, 8), matGold);
    goldP.position.set(0, 0.6, podiumZ);
    goldP.castShadow = true;
    scene.add(goldP);
    structures.push({ x: 0, z: podiumZ, radius: 0.95 });

    // Silver (Left)
    const silverP = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.8, 8), new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.3, metalness: 0.8 }));
    silverP.position.set(-2.5, 0.4, podiumZ);
    silverP.castShadow = true;
    scene.add(silverP);
    structures.push({ x: -2.5, z: podiumZ, radius: 0.95 });

    // Bronze (Right)
    const bronzeP = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0xcd7f32, roughness: 0.4, metalness: 0.6 }));
    bronzeP.position.set(2.5, 0.2, podiumZ);
    bronzeP.castShadow = true;
    scene.add(bronzeP);
    structures.push({ x: 2.5, z: podiumZ, radius: 0.95 });

    // Spawning characters on podiums (Gold, Silver, Bronze)
    // Gold
    if (members.length > 0) {
      const top1 = createCharacter(THREE, { handle: members[0].handle, tags: members[0].tags });
      top1.position.set(0, 1.2, podiumZ);
      top1.scale.set(0.85, 0.85, 0.85);
      scene.add(top1);
      podiumCharacters.push({ mesh: top1, animState: "celebrate", time: Math.random() * 100 });
      
      interactables.push({
        x: 0, z: podiumZ, radius: 1.6,
        message: `Press [E] to view Champion ${members[0].name}'s Passport`,
        action: () => onInteract({ type: "passport", member: members[0] })
      });
    }

    // Silver
    if (members.length > 1) {
      const top2 = createCharacter(THREE, { handle: members[1].handle, tags: members[1].tags });
      top2.position.set(-2.5, 0.8, podiumZ);
      top2.scale.set(0.85, 0.85, 0.85);
      scene.add(top2);
      podiumCharacters.push({ mesh: top2, animState: "wave", time: Math.random() * 100 });

      interactables.push({
        x: -2.5, z: podiumZ, radius: 1.6,
        message: `Press [E] to view Runner-up ${members[1].name}'s Passport`,
        action: () => onInteract({ type: "passport", member: members[1] })
      });
    }

    // Bronze
    if (members.length > 2) {
      const top3 = createCharacter(THREE, { handle: members[2].handle, tags: members[2].tags });
      top3.position.set(2.5, 0.4, podiumZ);
      top3.scale.set(0.85, 0.85, 0.85);
      scene.add(top3);
      podiumCharacters.push({ mesh: top3, animState: "idle", time: Math.random() * 100 });

      interactables.push({
        x: 2.5, z: podiumZ, radius: 1.6,
        message: `Press [E] to view Third-place ${members[2].name}'s Passport`,
        action: () => onInteract({ type: "passport", member: members[2] })
      });
    }

    // Leaderboard scoreboard plaque
    const plaqueMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const plaqueGGroup = new THREE.Group();
    plaqueGGroup.position.set(0, 0, 140.5);

    const baseP = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.8), plaqueMat);
    baseP.position.y = 0.05;
    const postP = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), plaqueMat);
    postP.position.y = 0.5;
    const boardP = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.1), plaqueMat);
    boardP.position.y = 0.95;
    boardP.rotation.x = -0.3;
    const screenP = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.02), matGold);
    screenP.position.set(0, 0.95, 0.061);
    screenP.rotation.x = -0.3;
    plaqueGGroup.add(baseP, postP, boardP, screenP);
    
    scene.add(plaqueGGroup);
    structures.push({ x: 0, z: 140.5, radius: 0.8 });

    interactables.push({
      x: 0, z: 141.6, radius: 1.8,
      message: "Press [E] to read Hall of Fame Rankings",
      action: () => onInteract({ type: "leaderboard" })
    });
  }
  createHallOfFame();

  playerController = new PlayerController();

  // ── 9. INTERIOR WORKSHOP MANAGEMENT ────────────────────────────────────
  function triggerEnterWorkshop(member) {
    if (currentViewState !== "town") return;
    
    const overlay = document.getElementById("screenOverlay");
    overlay.classList.add("fade-black");

    setTimeout(() => {
      currentViewState = "workshop";
      
      playerController.mesh.position.set(0, 0.35, 120); // workshop spawn point
      playerController.yaw = Math.PI;
      playerController.pitch = -0.15;
      playerController.keys = { w: false, a: false, s: false, d: false, shift: false, space: false };

      const interest = getBuilderInterest(member.tags);
      const interior = createInterior(THREE, interest, member);
      interior.position.set(0, 0, 120);
      scene.add(interior);

      const roomLight = new THREE.PointLight(0xffffff, 1.2, 20);
      roomLight.position.set(0, 5.0, 120);
      roomLight.castShadow = true;
      interior.add(roomLight);

      activeWorkshop = {
        group: interior,
        member: member,
        styleType: interest
      };

      structures = [
        { x: 0, z: 120 - 4.8, radius: 1.4 },
      ];

      interactables = [
        {
          x: 0, z: 120 - 3.4, radius: 1.6,
          message: "Press [E] to open Personal Site",
          action: () => {
            window.open(member.site, "_blank");
          }
        },
        {
          x: 0, z: 120 + 5.2, radius: 1.6,
          message: "Press [E] to exit Workshop",
          action: () => triggerExitWorkshop()
        }
      ];

      sun.visible = false;
      streetlights.forEach(sl => sl.visible = false);

      setTimeout(() => {
        overlay.classList.remove("fade-black");
      }, 300);

    }, 500);
  }

  function triggerExitWorkshop() {
    if (currentViewState !== "workshop") return;

    const overlay = document.getElementById("screenOverlay");
    overlay.classList.add("fade-black");

    setTimeout(() => {
      if (activeWorkshop) {
        scene.remove(activeWorkshop.group);
        activeWorkshop = null;
      }

      currentViewState = "town";
      sun.visible = true;

      const index = members.findIndex(m => m.handle === activeWorkshop?.member?.handle) || 0;
      const isLeft = index % 2 === 0;
      const row = Math.floor(index / 2);
      const plotX = isLeft ? 15 : -15;
      const plotZ = 28 + row * 22;

      playerController.mesh.position.set(plotX + 5.15, 0.35, plotZ + 1.8);
      playerController.yaw = 0;
      playerController.pitch = -0.25;

      // Re-enable collisions & interactables for town
      structures = [];
      interactables = [];
      residents = [];
      podiumCharacters = [];
      
      structures.push({ x: 0, z: 0, radius: 2.5 }); // fountain
      structures.push({ x: 0, z: 7.5, radius: 1.0 }); // noticeboard
      structures.push({ x: 0, z: -22, radius: 8.5 }); // Town hall
      structures.push({ x: 0, z: -15, radius: 1.2 }); // plaque
      structures.push({ x: 22, z: -3, radius: 5.0 }); // cafe

      interactables.push({
        x: 0, z: 8.8, radius: 1.6,
        message: "Press [E] to read Community Board",
        action: () => onInteract({ type: "chat" })
      });
      interactables.push({
        x: 0, z: -13.5, radius: 1.8,
        message: "Press [E] to read Town Hall Leaderboard",
        action: () => onInteract({ type: "leaderboard" })
      });

      generateNeighborhood();
      createHallOfFame();

      setTimeout(() => {
        overlay.classList.remove("fade-black");
      }, 300);

    }, 500);
  }

  // Keyboard handler for interacting (pressing E)
  window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "e") {
      let closest = null;
      let minDist = 999;

      interactables.forEach(item => {
        const dx = playerController.mesh.position.x - item.x;
        const dz = playerController.mesh.position.z - item.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < item.radius && dist < minDist) {
          minDist = dist;
          closest = item;
        }
      });

      if (closest) {
        closest.action();
      }
    }
  });

  // ── 10. GAME TICK / UPDATE LOOP ────────────────────────────────────────
  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.1);
    const totalTime = clock.getElapsedTime();

    if (playerController) {
      playerController.update(dt);
    }

    if (currentViewState === "workshop") {
      playerController.mesh.position.x = Math.max(-5.5, Math.min(5.5, playerController.mesh.position.x));
      playerController.mesh.position.z = Math.max(120 - 5.5, Math.min(120 + 5.5, playerController.mesh.position.z));
      
      if (activeWorkshop) {
        animateInterior(THREE, activeWorkshop.group, totalTime, activeWorkshop.styleType);
      }
    } else {
      const fountainDrops = scene.getObjectByName("waterDrops");
      if (fountainDrops) {
        fountainDrops.children.forEach(drop => {
          const ud = drop.userData;
          const phase = (totalTime * ud.speed + ud.offset) % 1.5;
          const h = 2.1 + (Math.sin((phase / 1.5) * Math.PI) * 0.8);
          const r = ud.radius * (phase / 1.5);
          drop.position.set(Math.sin(ud.angle) * r, h, Math.cos(ud.angle) * r);
        });
      }

      // Resident AI: wave when close
      residents.forEach(res => {
        res.time += dt;
        const dx = playerController.mesh.position.x - res.mesh.position.x;
        const dz = playerController.mesh.position.z - res.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 4.8) {
          const targetAngle = Math.atan2(dx, dz);
          let angleDiff = targetAngle - res.mesh.rotation.y;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          res.mesh.rotation.y += angleDiff * 0.1;

          res.animState = "wave";
        } else {
          let angleDiff = Math.PI - res.mesh.rotation.y;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          res.mesh.rotation.y += angleDiff * 0.05;

          res.animState = "idle";
        }

        animateCharacter(res.mesh, res.animState, res.time, 1.0);
      });

      // Animate weekly top builders on podiums
      podiumCharacters.forEach(p => {
        p.time += dt;
        animateCharacter(p.mesh, p.animState, p.time, 1.0);
      });

      // Permanent Bright, Sunny Day Settings
      sun.intensity = 1.4;
      ambient.intensity = 0.85;
      scene.background.setHex(0xb8e3fc);
      scene.fog.color.setHex(0xb8e3fc);
      scene.fog.density = 0.004;

      streetlights.forEach(sl => {
        sl.intensity = 0.0;
      });
    }

    // UI interaction prompt manager
    let interactText = "";
    let closestItem = null;
    let minDist = 999;

    interactables.forEach(item => {
      const dx = playerController.mesh.position.x - item.x;
      const dz = playerController.mesh.position.z - item.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < item.radius && dist < minDist) {
        minDist = dist;
        closestItem = item;
      }
    });

    if (closestItem) {
      interactText = closestItem.message;
      interactionPrompt.classList.add("visible");
      interactionPrompt.textContent = interactText;
    } else {
      interactionPrompt.classList.remove("visible");
    }

    renderer.render(scene, camera);
  }
  
  animate();

  // Resize window handler
  function handleResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  window.addEventListener("resize", handleResize);

  // Return handles to stop or reset
  return {
    destroy: () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
    teleportToHouse: (handle) => {
      if (currentViewState !== "town") {
        triggerExitWorkshop();
      }
      const index = members.findIndex(m => m.handle === handle);
      if (index !== -1) {
        const isLeft = index % 2 === 0;
        const row = Math.floor(index / 2);
        const plotX = isLeft ? 15 : -15;
        const plotZ = 28 + row * 22;

        // Teleport slightly in front of their mailbox/entrance
        playerController.mesh.position.set(plotX + (isLeft ? -4.0 : 4.0), 0.35, plotZ + 8.2);
        playerController.yaw = isLeft ? -Math.PI / 2 : Math.PI / 2; // look towards their plot
        playerController.pitch = -0.2;
      }
    }
  };
}
