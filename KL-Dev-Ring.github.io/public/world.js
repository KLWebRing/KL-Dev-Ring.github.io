/**
 * world.js - Core 3D Town Engine, Controls, Physics, and Layout Manager
 * Handles the Three.js scene loop, third-person player controller, collisions,
 * procedural street decoration, day/night cycles, and interactive state triggers.
 */

import { createCharacter, animateCharacter, createToonMesh } from "./character.js";
import { createHouse, createInterior, animateInterior, getBuilderInterest } from "./house.js";

function createSkyGradientTexture(THREE) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  
  // Vertical linear gradient from top to bottom
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#0284c7");    // Deep sky blue at the top
  grad.addColorStop(0.5, "#38bdf8");  // Soft cyan/light blue
  grad.addColorStop(0.85, "#e0f2fe"); // Very light blue/cyan near horizon
  grad.addColorStop(1.0, "#ffdcb8");  // Warm peach/orange horizon at the bottom
  
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function spawnLowPolyClouds(THREE, scene) {
  const cloudGroup = new THREE.Group();
  cloudGroup.name = "clouds";
  
  const cloudCount = 18;
  const matCloud = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: true });
  
  for (let i = 0; i < cloudCount; i++) {
    const singleCloud = new THREE.Group();
    
    const cx = Math.random() * 260 - 130;
    const cy = 22 + Math.random() * 14;
    const cz = Math.random() * 260 - 110;
    
    singleCloud.position.set(cx, cy, cz);
    
    const sphereCount = 3 + Math.floor(Math.random() * 3);
    for (let s = 0; s < sphereCount; s++) {
      const radius = 1.6 + Math.random() * 2.4;
      const geo = new THREE.SphereGeometry(radius, 8, 8);
      const sphereMesh = createToonMesh(THREE, geo, matCloud, 0.04);
      
      const sx = (s - (sphereCount - 1) / 2) * 2.0 + (Math.random() * 0.8 - 0.4);
      const sy = Math.random() * 0.6 - 0.3;
      const sz = Math.random() * 0.8 - 0.4;
      sphereMesh.position.set(sx, sy, sz);
      
      singleCloud.add(sphereMesh);
    }
    
    singleCloud.userData = {
      speed: 0.9 + Math.random() * 1.5,
      originX: cx
    };
    
    cloudGroup.add(singleCloud);
  }
  
  scene.add(cloudGroup);
}

export function initWorld(THREE, container, members, onInteract) {
  let scene, camera, renderer, townGroup;
  let player, playerController;
  let structures = []; // collision objects
  let interactables = []; // interactive items (noticeboard, mailboxes, doors)
  let residents = []; // resident npc characters
  let podiumCharacters = []; // weekly top builders on podiums
  let marketNPCs = []; // marketplace shopkeepers and customer characters
  let streetlights = [];
  let dayNightCycle = { time: 0, sunLight: null, ambientLight: null };
  let riverTex;

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
  scene.background = new THREE.Color(0xffdcb8);
  scene.fog = new THREE.FogExp2(0xffdcb8, 0.0035);

  // Create Sky Dome
  const skyGeo = new THREE.SphereGeometry(230, 32, 16);
  const skyTex = createSkyGradientTexture(THREE);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.DoubleSide,
    fog: false
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);

  // Spawn clouds
  spawnLowPolyClouds(THREE, scene);

  townGroup = new THREE.Group();
  scene.add(townGroup);

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
    // 1. Generate Grass Texture using Canvas
    const grassCanvas = document.createElement("canvas");
    grassCanvas.width = 256;
    grassCanvas.height = 256;
    const gCtx = grassCanvas.getContext("2d");
    gCtx.fillStyle = "#489047"; // base green
    gCtx.fillRect(0, 0, 256, 256);
    // Draw noise/blades
    const greens = ["#387f37", "#438e42", "#286828", "#59a058", "#6fb26e", "#4b8543", "#3a7332"];
    for (let i = 0; i < 22000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = 1 + Math.random() * 1.5;
      gCtx.fillStyle = greens[Math.floor(Math.random() * greens.length)];
      gCtx.fillRect(x, y, size, size);
    }
    const grassTex = new THREE.CanvasTexture(grassCanvas);
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(48, 48); // Repeat many times

    // Large ground plane
    const floorGeo = new THREE.PlaneGeometry(350, 350);
    const floorMat = new THREE.MeshToonMaterial({ map: grassTex });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    townGroup.add(floor);

    // 2. Generate Road Texture using Canvas (with yellow dashed line)
    const roadCanvas = document.createElement("canvas");
    roadCanvas.width = 64;
    roadCanvas.height = 128;
    const rCtx = roadCanvas.getContext("2d");
    rCtx.fillStyle = "#5c5f62"; // road gray
    rCtx.fillRect(0, 0, 64, 128);
    // Asphalt grain
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 128;
      const val = Math.floor(Math.random() * 16) - 8;
      rCtx.fillStyle = `rgb(${92 + val}, ${95 + val}, ${98 + val})`;
      rCtx.fillRect(x, y, 1, 1);
    }
    // Dotted center yellow line
    rCtx.strokeStyle = "#facc15";
    rCtx.lineWidth = 2.5;
    rCtx.setLineDash([12, 12]);
    rCtx.beginPath();
    rCtx.moveTo(32, 0);
    rCtx.lineTo(32, 128);
    rCtx.stroke();
    
    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
    
    // Repeat texture along the length of the road
    const roadSouthTex = roadTex.clone();
    roadSouthTex.repeat.set(1, 20);

    const roadEastTex = roadTex.clone();
    roadEastTex.repeat.set(6, 1);

    // Center Plaza asphalt circle
    const plazaGeo = new THREE.CircleGeometry(16, 32);
    const plazaMat = new THREE.MeshToonMaterial({ color: 0xbdc3c7 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.rotation.x = -Math.PI / 2;
    plaza.position.y = 0.01;
    plaza.receiveShadow = true;
    townGroup.add(plaza);

    // Main Roads
    const roadMatSouth = new THREE.MeshToonMaterial({ map: roadSouthTex });
    const roadMatEastWest = new THREE.MeshToonMaterial({ map: roadEastTex });
    
    // South Road - extended to 180 units
    const roadSouth = new THREE.Mesh(new THREE.PlaneGeometry(6, 180), roadMatSouth);
    roadSouth.rotation.x = -Math.PI / 2;
    roadSouth.position.set(0, 0.015, 106);
    roadSouth.receiveShadow = true;
    townGroup.add(roadSouth);

    // East Road
    const roadEast = new THREE.Mesh(new THREE.PlaneGeometry(50, 5), roadMatEastWest);
    roadEast.rotation.x = -Math.PI / 2;
    roadEast.position.set(41, 0.015, 0);
    roadEast.receiveShadow = true;
    townGroup.add(roadEast);

    // West Road
    const roadWest = new THREE.Mesh(new THREE.PlaneGeometry(50, 5), roadMatEastWest);
    roadWest.rotation.x = -Math.PI / 2;
    roadWest.position.set(-41, 0.015, 0);
    roadWest.receiveShadow = true;
    townGroup.add(roadWest);

    // 3. Generate Sidewalk Texture using Canvas
    const swCanvas = document.createElement("canvas");
    swCanvas.width = 64;
    swCanvas.height = 64;
    const sCtx = swCanvas.getContext("2d");
    sCtx.fillStyle = "#d1d5db"; // light concrete
    sCtx.fillRect(0, 0, 64, 64);
    // Concrete grain
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      const val = Math.floor(Math.random() * 10) - 5;
      sCtx.fillStyle = `rgb(${209 + val}, ${213 + val}, ${219 + val})`;
      sCtx.fillRect(x, y, 1, 1);
    }
    // Sidewalk lines
    sCtx.strokeStyle = "#9ca3af";
    sCtx.lineWidth = 1.5;
    sCtx.beginPath();
    sCtx.moveTo(0, 62);
    sCtx.lineTo(64, 62); // border line
    sCtx.moveTo(32, 0);
    sCtx.lineTo(32, 64); // concrete seam
    sCtx.stroke();
    const swTex = new THREE.CanvasTexture(swCanvas);
    swTex.wrapS = swTex.wrapT = THREE.RepeatWrapping;
    swTex.repeat.set(1, 45); // Repeat along sidewalks length

    // Sidewalks & Curbs
    const sidewalkMat = new THREE.MeshToonMaterial({ map: swTex });
    
    // South Road Sidewalks (left and right of road) - extended to 180 units
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 180), sidewalkMat);
    swLeft.position.set(3.6, 0.05, 106);
    swLeft.castShadow = true;
    swLeft.receiveShadow = true;
    townGroup.add(swLeft);

    const swRight = swLeft.clone();
    swRight.position.x = -3.6;
    townGroup.add(swRight);

    // Crosswalks on South Road near Plaza
    const crosswalkMat = new THREE.MeshToonMaterial({ color: 0xe5e7eb });
    for (let offset = 0; offset < 5; offset++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 4), crosswalkMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-2 + offset * 1, 0.02, 18);
      townGroup.add(stripe);
    }
  }
  createGround();

  // ── 4. PLAYER CONTROLLER ───────────────────────────────────────────────
  class PlayerController {
    constructor() {
      this.mesh = createCharacter(THREE, { handle: "player", shirtColor: "#dc2626", tags: ["ai", "webdev"] });
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
      this.mesh.position.z = Math.max(-55, Math.min(205, this.mesh.position.z));

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

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.5, 8), new THREE.MeshToonMaterial({ color: 0x1e293b }));
    base.position.y = 0.25;
    base.castShadow = true;
    base.receiveShadow = true;
    fGroup.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.8, 8), new THREE.MeshToonMaterial({ color: 0x1e293b }));
    pillar.position.y = 1.15;
    pillar.castShadow = true;
    fGroup.add(pillar);

    // Water surface
    const water = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.05, 8), new THREE.MeshToonMaterial({ color: 0x38bdf8, opacity: 0.6, transparent: true }));
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
    townGroup.add(fGroup);

    structures.push({ x: 0, z: 0, radius: 2.5 });
  }

  function createNoticeBoard() {
    const matWood = new THREE.MeshToonMaterial({ color: 0x78350f });
    const matPaper = new THREE.MeshToonMaterial({ color: 0xfef3c7 });

    const board = new THREE.Group();
    board.position.set(0, 0, 7.5); // Facing south

    const postL = createToonMesh(THREE, new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8), matWood, 0.02);
    postL.position.set(-1.2, 1.2, 0);
    const postR = postL.clone();
    postR.position.x = 1.2;
    board.add(postL, postR);

    // Frame
    const frame = createToonMesh(THREE, new THREE.BoxGeometry(2.6, 1.4, 0.15), matWood, 0.02);
    frame.position.y = 1.8;
    board.add(frame);

    // Paper noticeboard plane
    const paper = createToonMesh(THREE, new THREE.BoxGeometry(2.3, 1.15, 0.06), matPaper, 0);
    paper.position.set(0, 1.8, 0.05);
    board.add(paper);

    // Little paper post-its
    const noteColors = [0xf43f5e, 0x3b82f6, 0x10b981, 0xeab308];
    for (let i = 0; i < 4; i++) {
      const note = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.01),
        new THREE.MeshToonMaterial({ color: noteColors[i] })
      );
      note.position.set(-0.8 + i * 0.5, 1.8 + (Math.sin(i) * 0.2), 0.09);
      note.rotation.z = Math.sin(i) * 0.15;
      board.add(note);
    }

    townGroup.add(board);
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

    const matBricks = new THREE.MeshToonMaterial({ color: 0x374151 }); // dark gray brick facade
    const matPillars = new THREE.MeshToonMaterial({ color: 0xd1d5db }); // white concrete pillars
    const matGold = new THREE.MeshToonMaterial({ color: 0xd97706, emissive: 0xd97706, emissiveIntensity: 0.2 });
    const matBlack = new THREE.MeshToonMaterial({ color: 0x18181b });

    // Main hall base block
    const base = createToonMesh(THREE, new THREE.BoxGeometry(16, 5.5, 8), matBricks, 0.02);
    base.position.y = 2.75;
    tGroup.add(base);

    // Neoclassical Triangular roof top
    const roof = createToonMesh(THREE, new THREE.ConeGeometry(9.2, 2.5, 4), matPillars, 0.02);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1.0, 1.0, 0.5);
    roof.position.set(0, 6.75, 0);
    tGroup.add(roof);

    // Front Pillars
    for (let x = -7; x <= 7; x += 3.5) {
      const pillar = createToonMesh(THREE, new THREE.CylinderGeometry(0.24, 0.28, 5.0, 8), matPillars, 0.02);
      pillar.position.set(x, 2.5, 4.2);
      tGroup.add(pillar);
    }

    // Leaderboard Plaque in front
    const plaqueGroup = new THREE.Group();
    plaqueGroup.position.set(0, 0, 7.0);

    const pBase = createToonMesh(THREE, new THREE.BoxGeometry(2.4, 0.2, 1.0), matPillars, 0.02);
    pBase.position.y = 0.1;
    plaqueGroup.add(pBase);

    const pPillar = createToonMesh(THREE, new THREE.BoxGeometry(0.3, 1.3, 0.3), matPillars, 0.02);
    pPillar.position.y = 0.85;
    plaqueGroup.add(pPillar);

    const pScreen = createToonMesh(THREE, new THREE.BoxGeometry(1.8, 1.1, 0.15), matBlack, 0.02);
    pScreen.position.y = 1.6;
    
    // Glowing neon frame
    const pGlow = createToonMesh(THREE, new THREE.BoxGeometry(1.68, 0.98, 0.05), matGold, 0);
    pGlow.position.set(0, 1.6, 0.07);
    plaqueGroup.add(pScreen, pGlow);
    tGroup.add(plaqueGroup);

    townGroup.add(tGroup);
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

    const matWood = new THREE.MeshToonMaterial({ color: 0x78350f });
    const matWalls = new THREE.MeshToonMaterial({ color: 0x9a3412 }); // reddish brick
    const matCanopy = new THREE.MeshToonMaterial({ color: 0xee5a43 }); // orange canopy
    const matCanopyWhite = new THREE.MeshToonMaterial({ color: 0xf3f4f6 });

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
    const tableMat = new THREE.MeshToonMaterial({ color: 0xd1d5db });
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

    townGroup.add(groupCafe);
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
      townGroup.add(houseGroup);

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
      townGroup.add(resG);

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
    const lightMat = new THREE.MeshToonMaterial({ color: 0xd1d5db });
    const bulbMat = new THREE.MeshToonMaterial({ color: 0xfffcd3, emissive: 0xfffcd3, emissiveIntensity: 1.0 });

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

      townGroup.add(slL);
      streetlights.push(spot);

      // Right streetlight
      const slR = slL.clone();
      slR.position.x = -3.4;
      slR.children[1].position.x = 0.25;
      slR.children[2].position.x = 0.5;
      slR.children[3].position.x = 0.5;
      slR.children[3].target.position.x = 0.5;
      townGroup.add(slR);
      
      const clonedSpot = slR.children.find(c => c.isSpotLight);
      if (clonedSpot) streetlights.push(clonedSpot);
    }
  }
  createStreetlights();

  function createCoconutTree(THREE) {
    const tree = new THREE.Group();
    const matWood = new THREE.MeshToonMaterial({ color: 0x78350f });
    const trunk = createToonMesh(THREE, new THREE.CylinderGeometry(0.15, 0.25, 2.8, 8), matWood, 0.02);
    trunk.position.y = 1.4;
    tree.add(trunk);

    const matLeaves = new THREE.MeshToonMaterial({ color: 0x22c55e });
    for (let i = 0; i < 5; i++) {
      const leaf = createToonMesh(THREE, new THREE.BoxGeometry(1.8, 0.1, 0.6), matLeaves, 0.02);
      leaf.position.y = 2.8;
      leaf.rotation.y = (Math.PI * 2 / 5) * i;
      leaf.rotation.z = 0.3;
      leaf.position.x = Math.cos(leaf.rotation.y) * 0.8;
      leaf.position.z = -Math.sin(leaf.rotation.y) * 0.8;
      tree.add(leaf);
    }
    
    // Coconuts
    const matCoco = new THREE.MeshToonMaterial({ color: 0x451a03 });
    for(let i = 0; i < 3; i++) {
        const coco = createToonMesh(THREE, new THREE.SphereGeometry(0.18, 8, 8), matCoco, 0.02);
        coco.position.set(
            Math.cos(i * Math.PI * 2 / 3) * 0.3,
            2.6,
            Math.sin(i * Math.PI * 2 / 3) * 0.3
        );
        tree.add(coco);
    }

    return tree;
  }

  // Decorative trees around the plaza (replaced with coconut trees)
  function createPlazaDecorations() {
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      if (Math.abs(Math.sin(angle)) < 0.2) continue;

      const px = Math.sin(angle) * 19;
      const pz = Math.cos(angle) * 19;

      const tree = createCoconutTree(THREE);
      tree.position.set(px, 0, pz);

      townGroup.add(tree);
      structures.push({ x: px, z: pz, radius: 0.8 });
    }
  }
  createPlazaDecorations();

  // Helper for generating procedural water texture for the backwater river
  function createRiverTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0284c7"; // blue base water
    ctx.fillRect(0, 0, 128, 128);
    
    // Add wave patterns
    ctx.strokeStyle = "#38bdf8"; // lighter blue waves
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      const y = i * 24;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(32, y + 8, 96, y - 8, 128, y);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 30);
    return texture;
  }

  // Helper for generating clay tile textures for marketplace/exhibition hall roofs
  function createMarketRoofTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    
    // Base terracotta clay color
    ctx.fillStyle = "#a83a22";
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
    ctx.lineWidth = 1.5;
    
    // Draw clay tile rows (scalloped arcs)
    for (let r = 0; r < 8; r++) {
      const y = r * 8;
      for (let c = 0; c < 8; c++) {
        const x = c * 8;
        ctx.beginPath();
        ctx.arc(x + 4, y, 4, 0, Math.PI);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, y + 8);
      ctx.lineTo(64, y + 8);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  // Helper for generating paved cobblestone textures for the marketplace ground
  function createCobblestoneTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#8a8d90";
    ctx.fillRect(0, 0, 128, 128);
    
    // Draw irregular cobblestones
    const stoneColors = ["#7a7d80", "#8e9194", "#9fa2a5", "#aaadbe", "#9a9082", "#84827d"];
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#404245";
    
    const rows = 8;
    const cols = 8;
    const w = 128 / cols;
    const h = 128 / rows;
    
    for (let r = 0; r < rows; r++) {
      const y = r * h;
      const offset = (r % 2) * (w / 2); // staggered pattern
      for (let c = -1; c <= cols; c++) {
        const x = c * w + offset;
        ctx.fillStyle = stoneColors[Math.floor(Math.random() * stoneColors.length)];
        
        ctx.beginPath();
        const paddingX = 2;
        const paddingY = 2;
        const sx = x + paddingX;
        const sy = y + paddingY;
        const sw = w - paddingX * 2;
        const sh = h - paddingY * 2;
        
        if (ctx.roundRect) {
          ctx.roundRect(sx, sy, sw, sh, 4);
        } else {
          ctx.rect(sx, sy, sw, sh);
        }
        ctx.fill();
        ctx.stroke();
      }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    return texture;
  }

  // Helper for generating striped fabric textures for shop awnings
  function createStripedTexture(THREE, color1, color2) {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 32, 32);
    
    ctx.fillStyle = color2;
    ctx.fillRect(0, 0, 16, 32); // Half and half vertical stripes
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 2);
    return texture;
  }

  // Helper for generating coir mat / handloom textile texture
  function createCoirTexture(THREE) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    
    ctx.fillStyle = "#cca070";
    ctx.fillRect(0, 0, 64, 64);
    
    // Draw crosshatch weave pattern
    ctx.strokeStyle = "#805830";
    ctx.lineWidth = 1;
    for (let i = 0; i < 64; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 64);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(64, i);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  // Helper to suspend a festive bunting flag string between two points
  function createBuntingString(THREE, startPoint, endPoint, group) {
    const linePoints = [];
    const numSegments = 16;
    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const p = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
      // Add parabolic sag in the middle
      p.y -= Math.sin(t * Math.PI) * 0.8;
      linePoints.push(p);
    }
    
    // Draw string line
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x444444, linewidth: 2 });
    const line = new THREE.Line(lineGeo, lineMat);
    group.add(line);
    
    // Hang triangular flags
    const flagColors = [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6, 0xec4899, 0x8b5cf6];
    for (let i = 1; i < numSegments; i++) {
      const p = linePoints[i];
      const flagGeo = new THREE.ConeGeometry(0.12, 0.22, 3);
      const flagMat = new THREE.MeshToonMaterial({ 
        color: flagColors[i % flagColors.length],
        side: THREE.DoubleSide
      });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.copy(p);
      flag.position.y -= 0.11;
      flag.rotation.x = Math.PI;
      flag.castShadow = true;
      group.add(flag);
    }
  }

  // ── KERALA LANDSCAPE (RIVER, BRIDGE & MOUNTAINS) ────────────────────────
  function createKeralaLandscape() {
    const landscapeGroup = new THREE.Group();
    landscapeGroup.name = "keralaLandscape";

    // 1. Backwater River running North-South at x = 45 (with animated water)
    const riverGeo = new THREE.PlaneGeometry(14, 350);
    riverTex = createRiverTexture(THREE);
    const riverMat = new THREE.MeshToonMaterial({ 
      map: riverTex, 
      transparent: true, 
      opacity: 0.85 
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(45, 0.012, 0);
    river.receiveShadow = true;
    landscapeGroup.add(river);

    // 2. Wooden Bridge at x = 45, z = 0 (crossing the East Road)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(45, 0, 0);

    const matBridgeWood = new THREE.MeshToonMaterial({ color: 0x513528 });

    // Deck
    const deck = createToonMesh(THREE, new THREE.BoxGeometry(14, 0.2, 5.2), matBridgeWood, 0.02);
    deck.position.y = 0.15;
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // Side handrails
    for (let side = -1; side <= 1; side += 2) {
      const zOffset = side * 2.5;
      
      const railTop = createToonMesh(THREE, new THREE.BoxGeometry(14, 0.08, 0.08), matBridgeWood, 0.02);
      railTop.position.set(0, 0.9, zOffset);
      
      const railBottom = createToonMesh(THREE, new THREE.BoxGeometry(14, 0.06, 0.06), matBridgeWood, 0.02);
      railBottom.position.set(0, 0.5, zOffset);
      bridgeGroup.add(railTop, railBottom);

      for (let px = -6.5; px <= 6.5; px += 2.1) {
        const post = createToonMesh(THREE, new THREE.CylinderGeometry(0.06, 0.06, 1.0, 6), matBridgeWood, 0.02);
        post.position.set(px, 0.5, zOffset);
        bridgeGroup.add(post);
      }
    }

    // Approach Ramps
    const rampGeo = new THREE.BoxGeometry(3.0, 0.15, 5.2);
    const rampL = createToonMesh(THREE, rampGeo, matBridgeWood, 0.02);
    rampL.position.set(-7.5, 0.075, 0);
    rampL.rotation.z = 0.05;
    
    const rampR = createToonMesh(THREE, rampGeo, matBridgeWood, 0.02);
    rampR.position.set(7.5, 0.075, 0);
    rampR.rotation.z = -0.05;
    bridgeGroup.add(rampL, rampR);

    landscapeGroup.add(bridgeGroup);
    
    structures.push({ x: 45, z: 0, radius: 3.5 });

    // 3. Distant Western Ghats Mountains in background (deformed for organic realism)
    const mountMat = new THREE.MeshToonMaterial({ color: 0x3d5f47 }); // richer dark green
    const mountainPositions = [
      { x: -140, z: -100, radius: 45, height: 35 },
      { x: -60, z: -130, radius: 55, height: 45 },
      { x: 0, z: -140, radius: 65, height: 50 },
      { x: 70, z: -130, radius: 55, height: 45 },
      { x: 140, z: -100, radius: 45, height: 35 },
      { x: -140, z: 50, radius: 40, height: 30 },
      { x: -140, z: 120, radius: 40, height: 30 },
      { x: 140, z: 60, radius: 40, height: 30 },
      { x: 140, z: 130, radius: 40, height: 30 }
    ];
    mountainPositions.forEach(m => {
      // Use higher segments count to allow smooth organic deformations
      const hillGeo = new THREE.ConeGeometry(m.radius, m.height, 12, 6);
      const posAttr = hillGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vy = posAttr.getY(i);
        // Deform only the upper vertices, leaving base clean
        if (vy > -m.height / 2 + 1.0) {
          const vx = posAttr.getX(i);
          const vz = posAttr.getZ(i);
          const angle = Math.atan2(vz, vx);
          // Apply organic ridges using wave functions
          const noise = Math.sin(vy * 0.4) * Math.cos(angle * 3.0) * (m.radius * 0.15);
          posAttr.setX(i, vx + Math.sin(angle) * noise);
          posAttr.setZ(i, vz + Math.cos(angle) * noise);
        }
      }
      hillGeo.computeVertexNormals();
      const hill = createToonMesh(THREE, hillGeo, mountMat, 0.012);
      hill.position.set(m.x, m.height / 2 - 2, m.z);
      landscapeGroup.add(hill);
    });

    // 4. Coconut Trees along river banks & roads
    const treeCoords = [
      { x: 35, z: -40 }, { x: 37, z: -20 }, { x: 35, z: 20 }, { x: 36, z: 40 }, { x: 35, z: 60 },
      { x: 55, z: -50 }, { x: 54, z: -30 }, { x: 55, z: 10 }, { x: 56, z: 30 }, { x: 55, z: 50 },
      { x: -25, z: 10 }, { x: -30, z: 20 }, { x: -28, z: 40 }, { x: -25, z: -20 },
      { x: 25, z: 10 }, { x: 28, z: 20 }, { x: 26, z: 40 }, { x: 25, z: -20 }
    ];
    treeCoords.forEach(tc => {
      const cTree = createCoconutTree(THREE);
      cTree.position.set(tc.x, 0, tc.z);
      landscapeGroup.add(cTree);
      structures.push({ x: tc.x, z: tc.z, radius: 0.8 });
    });

    townGroup.add(landscapeGroup);
  }
  createKeralaLandscape();

  // ── KERALA MARKETPLACE ──────────────────────────────────────────────────
  function createKeralaMarketplace() {
    const marketGroup = new THREE.Group();
    marketGroup.name = "keralaMarketplace";

    const roadMatEastWest = new THREE.MeshToonMaterial({ color: 0x5c5f62 });
    
    // Extended East Road connecting town to marketplace
    const extEastRoad = new THREE.Mesh(new THREE.PlaneGeometry(28, 5), roadMatEastWest);
    extEastRoad.rotation.x = -Math.PI / 2;
    extEastRoad.position.set(64, 0.015, 0);
    extEastRoad.receiveShadow = true;
    marketGroup.add(extEastRoad);

    // Cobblestone ground texture for the Marketplace Area
    const cobbleTex = createCobblestoneTexture(THREE);
    const cobbleMat = new THREE.MeshToonMaterial({ map: cobbleTex });
    const marketPlaza = new THREE.Mesh(new THREE.PlaneGeometry(18, 80), cobbleMat);
    marketPlaza.rotation.x = -Math.PI / 2;
    marketPlaza.position.set(85, 0.016, 0);
    marketPlaza.receiveShadow = true;
    marketGroup.add(marketPlaza);

    // Raised concrete sidewalks
    const swMat = new THREE.MeshToonMaterial({ color: 0xc1c5cb });
    const swLeft = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 80), swMat);
    swLeft.position.set(75.4, 0.05, 0);
    swLeft.receiveShadow = true;
    
    const swRight = swLeft.clone();
    swRight.position.x = 94.6;
    marketGroup.add(swLeft, swRight);

    // Materials
    const matWalls = new THREE.MeshToonMaterial({ color: 0xf4f1ea }); 
    const roofTex = createMarketRoofTexture(THREE);
    const matRoof = new THREE.MeshToonMaterial({ map: roofTex }); 
    const matWood = new THREE.MeshToonMaterial({ color: 0x513528 }); 
    const matThatch = new THREE.MeshToonMaterial({ color: 0xcca35a }); 
    const matMetal = new THREE.MeshToonMaterial({ color: 0x333333 });

    // Helper to build a shop box
    function buildShopStructure(x, z, rotationY, wallColor, awningTexOrMat, detailsCallback) {
      const shop = new THREE.Group();
      shop.position.set(x, 0, z);
      shop.rotation.y = rotationY;

      // Base/foundation
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.12, 2.6), new THREE.MeshToonMaterial({ color: 0x374151 }));
      base.position.y = 0.06;
      base.receiveShadow = true;
      shop.add(base);

      // Back Wall
      const sWallsMat = new THREE.MeshToonMaterial({ color: wallColor });
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.6, 0.1), sWallsMat);
      backWall.position.set(0, 1.3, -1.2);
      backWall.castShadow = true;
      shop.add(backWall);

      // Side Walls
      const sideWallL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 2.4), sWallsMat);
      sideWallL.position.set(-2.0, 1.3, 0);
      sideWallL.castShadow = true;
      const sideWallR = sideWallL.clone();
      sideWallR.position.x = 2.0;
      shop.add(sideWallL, sideWallR);

      // Pillars for Front Awning
      const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.4, 6), matWood);
      p1.position.set(-1.9, 1.2, 1.1);
      p1.castShadow = true;
      const p2 = p1.clone();
      p2.position.x = 1.9;
      shop.add(p1, p2);

      // Awning Roof
      const awningGeo = new THREE.BoxGeometry(4.6, 0.1, 2.8);
      const matAwning = (awningTexOrMat instanceof THREE.Texture)
        ? new THREE.MeshToonMaterial({ map: awningTexOrMat, side: THREE.DoubleSide })
        : awningTexOrMat;
      const awning = new THREE.Mesh(awningGeo, matAwning);
      awning.position.set(0, 2.45, 0.1);
      awning.rotation.x = 0.22;
      awning.castShadow = true;
      shop.add(awning);

      // Front Counter / Table
      const counter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.75, 1.0), matWood);
      counter.position.set(0, 0.375, 0.4);
      counter.castShadow = true;
      counter.receiveShadow = true;
      shop.add(counter);

      if (detailsCallback) detailsCallback(shop);

      marketGroup.add(shop);
      structures.push({ x: x, z: z, radius: 2.3 });
    }

    // ── SHOP 1: THATTUKADA (Tea Stall) (West Row, z = -18)
    const teaAwningMat = new THREE.MeshToonMaterial({ color: 0xc27c38 }); // dark canvas thatch
    buildShopStructure(71.5, -18, Math.PI / 2, 0xdcd7ca, teaAwningMat, (shop) => {
      // Benches
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.35), matWood);
      bench.position.set(0, 0.225, 1.5);
      bench.castShadow = true;
      shop.add(bench);

      // Tea Kettle
      const kettleGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8);
      const kettleMat = new THREE.MeshToonMaterial({ color: 0xb45309 });
      const kettle = new THREE.Mesh(kettleGeo, kettleMat);
      kettle.position.set(-0.7, 0.85, 0.4);
      kettle.castShadow = true;
      shop.add(kettle);

      // Tea Cups
      const cupGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6);
      const cupMat = new THREE.MeshToonMaterial({ color: 0xffffff });
      for (let c = 0; c < 3; c++) {
        const cup = new THREE.Mesh(cupGeo, cupMat);
        cup.position.set(-0.4 + c * 0.15, 0.79, 0.4);
        shop.add(cup);
      }

      // Hanging Bananas
      const bananaGroup = new THREE.Group();
      bananaGroup.position.set(1.1, 1.8, 0.8);
      const bananaMat = new THREE.MeshToonMaterial({ color: 0xeab308 });
      for (let b = 0; b < 6; b++) {
        const banana = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), bananaMat);
        banana.rotation.z = 0.15 + (b * 0.05);
        banana.position.set(Math.sin(b) * 0.06, -b * 0.04, 0);
        bananaGroup.add(banana);
      }
      shop.add(bananaGroup);
    });

    const npcRavi = createCharacter(THREE, { handle: "ravi", shirtColor: "#f8fafc", pantColor: "#cbd5e1" }); 
    npcRavi.position.set(70.0, 0, -18);
    npcRavi.rotation.y = Math.PI / 2;
    marketGroup.add(npcRavi);
    marketNPCs.push({ mesh: npcRavi, type: "shopkeeper", defaultFacing: Math.PI / 2, animState: "idle", time: Math.random() * 100 });
    
    interactables.push({
      x: 71.5, z: -18, radius: 2.2,
      message: "Press [E] to talk to Ravi (Tea Vendor)",
      action: () => onInteract({
        type: "npc_chat",
        name: "Ravi the Tea Vendor",
        message: "Cardamom tea is piping hot! Perfect for debugging segment faults. Have you visited the Project Exhibition Hall on the West side yet?"
      })
    });

    // ── SHOP 2: SPICE SHOP (West Row, z = 0)
    const redWhiteAwningTex = createStripedTexture(THREE, "#b91c1c", "#f3f4f6");
    buildShopStructure(71.5, 0, Math.PI / 2, 0xfaf5e6, redWhiteAwningTex, (shop) => {
      // 4 Spice mounds in baskets
      const spiceColors = [0xd97706, 0xef4444, 0xb45309, 0x166534]; 
      for (let s = 0; s < 4; s++) {
        const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.12, 8), matWood);
        basket.position.set(-1.0 + s * 0.65, 0.81, 0.4);
        basket.castShadow = true;
        shop.add(basket);

        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.22, 6), new THREE.MeshToonMaterial({ color: spiceColors[s] }));
        cone.position.set(-1.0 + s * 0.65, 0.92, 0.4);
        shop.add(cone);
      }
    });

    const npcDevi = createCharacter(THREE, { handle: "devi", shirtColor: "#ea580c", pantColor: "#cbd5e1" }); 
    npcDevi.position.set(70.0, 0, 0);
    npcDevi.rotation.y = Math.PI / 2;
    marketGroup.add(npcDevi);
    marketNPCs.push({ mesh: npcDevi, type: "shopkeeper", defaultFacing: Math.PI / 2, animState: "idle", time: Math.random() * 100 });

    interactables.push({
      x: 71.5, z: 0, radius: 2.2,
      message: "Press [E] to talk to Devi (Spice Merchant)",
      action: () => onInteract({
        type: "npc_chat",
        name: "Devi the Spice Merchant",
        message: "Fresh spices harvested directly from the Western Ghats! Guaranteed to spice up your developer journey and keep your Git commits fresh!"
      })
    });

    // ── SHOP 3: CLAY POTTERY SHOP (West Row, z = 18)
    const blueWhiteAwningTex = createStripedTexture(THREE, "#1d4ed8", "#f3f4f6");
    buildShopStructure(71.5, 18, Math.PI / 2, 0xe5e7eb, blueWhiteAwningTex, (shop) => {
      // Wooden shelves at the back
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.4), matWood);
      shelf.position.set(0, 1.1, -0.7);
      shelf.castShadow = true;
      shop.add(shelf);

      // Display pottery pots
      const clayMat = new THREE.MeshToonMaterial({ color: 0x9a3412 }); // terracotta clay
      for (let p = 0; p < 5; p++) {
        // Pots on shelves
        const pot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), clayMat);
        pot.position.set(-0.8 + p * 0.4, 0.72 + (p%2)*0.1, -0.6);
        pot.scale.set(1.0, 1.1, 1.0);
        pot.castShadow = true;
        shop.add(pot);

        // Pots on counter
        const counterPot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), clayMat);
        counterPot.position.set(-1.0 + p * 0.5, 0.88, 0.4);
        counterPot.castShadow = true;
        shop.add(counterPot);
      }
    });

    const npcHari = createCharacter(THREE, { handle: "hari", shirtColor: "#2563eb", pantColor: "#374151" });
    npcHari.position.set(70.0, 0, 18);
    npcHari.rotation.y = Math.PI / 2;
    marketGroup.add(npcHari);
    marketNPCs.push({ mesh: npcHari, type: "shopkeeper", defaultFacing: Math.PI / 2, animState: "idle", time: Math.random() * 100 });

    interactables.push({
      x: 71.5, z: 18, radius: 2.2,
      message: "Press [E] to talk to Hari (Potter)",
      action: () => onInteract({
        type: "npc_chat",
        name: "Hari the Potter",
        message: "Traditional clay pots baked to perfection, just like our production builds. Take one to store your offline SQLite databases!"
      })
    });

    // ── SHOP 4: HANDICRAFTS BOUTIQUE (East Row, z = -18)
    const greenWhiteAwningTex = createStripedTexture(THREE, "#047857", "#f3f4f6");
    buildShopStructure(98.5, -18, -Math.PI / 2, 0xf3f4f6, greenWhiteAwningTex, (shop) => {
      // Nilavilakku Brass Lamps display
      const brassMat = new THREE.MeshToonMaterial({ color: 0xd4af37 }); 
      for (let l = 0; l < 3; l++) {
        const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 8), brassMat);
        lampBase.position.set(-0.8 + l * 0.8, 0.85, 0.4);
        lampBase.castShadow = true;
        const lampTop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brassMat);
        lampTop.position.set(-0.8 + l * 0.8, 1.025, 0.4);
        shop.add(lampBase, lampTop);
      }
    });

    const npcUnni = createCharacter(THREE, { handle: "unni", shirtColor: "#16a34a", pantColor: "#cbd5e1" }); 
    npcUnni.position.set(100.0, 0, -18);
    npcUnni.rotation.y = -Math.PI / 2;
    marketGroup.add(npcUnni);
    marketNPCs.push({ mesh: npcUnni, type: "shopkeeper", defaultFacing: -Math.PI / 2, animState: "idle", time: Math.random() * 100 });

    interactables.push({
      x: 98.5, z: -18, radius: 2.2,
      message: "Press [E] to talk to Unni (Handicrafts)",
      action: () => onInteract({
        type: "npc_chat",
        name: "Unni the Craft Merchant",
        message: "Nilavilakku brass lamps and hand-carved teak models. Light a lamp and let it guide you through your compile errors!"
      })
    });

    // ── SHOP 5: COIR & HANDLOOM STALL (East Row, z = 0)
    const orangeWhiteAwningTex = createStripedTexture(THREE, "#ea580c", "#f3f4f6");
    buildShopStructure(98.5, 0, -Math.PI / 2, 0xfef3c7, orangeWhiteAwningTex, (shop) => {
      // Coir mat on counter
      const coirTex = createCoirTexture(THREE);
      const coirMat = new THREE.MeshToonMaterial({ map: coirTex });
      const matMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.02, 0.8), coirMat);
      matMesh.position.set(-0.7, 0.77, 0.4);
      matMesh.receiveShadow = true;
      shop.add(matMesh);

      // Fabric rolls stacked
      const fabricColors = [0xef4444, 0x3b82f6, 0x10b981, 0xd97706];
      for (let f = 0; f < 4; f++) {
        const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8), new THREE.MeshToonMaterial({ color: fabricColors[f] }));
        roll.position.set(0.3 + f * 0.22, 0.84, 0.4);
        roll.rotation.x = Math.PI / 2;
        roll.castShadow = true;
        shop.add(roll);
      }
    });

    const npcMeera = createCharacter(THREE, { handle: "meera", shirtColor: "#db2777", pantColor: "#cbd5e1" });
    npcMeera.position.set(100.0, 0, 0);
    npcMeera.rotation.y = -Math.PI / 2;
    marketGroup.add(npcMeera);
    marketNPCs.push({ mesh: npcMeera, type: "shopkeeper", defaultFacing: -Math.PI / 2, animState: "idle", time: Math.random() * 100 });

    interactables.push({
      x: 98.5, z: 0, radius: 2.2,
      message: "Press [E] to talk to Meera (Handlooms)",
      action: () => onInteract({
        type: "npc_chat",
        name: "Meera the Weaver",
        message: "Coir door mats and hand-woven Kasavu textiles. Clean threads, clean code—that's my motto!"
      })
    });

    // ── SHOP 6: FRUIT & TENDER COCONUT STALL (East Row, z = 18)
    const yellowWhiteAwningTex = createStripedTexture(THREE, "#eab308", "#f3f4f6");
    buildShopStructure(98.5, 18, -Math.PI / 2, 0xecfdf5, yellowWhiteAwningTex, (shop) => {
      // Crates of fruits
      const greenCoconutsMat = new THREE.MeshToonMaterial({ color: 0x84cc16 });
      const mangoMat = new THREE.MeshToonMaterial({ color: 0xfacc15 });
      
      // Crates
      const crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.8), matWood);
      crate1.position.set(-0.7, 0.85, 0.4);
      crate1.castShadow = true;
      shop.add(crate1);

      const crate2 = crate1.clone();
      crate2.position.x = 0.5;
      shop.add(crate2);

      // Green coconuts in crate 1
      for (let c = 0; c < 5; c++) {
        const coco = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), greenCoconutsMat);
        const ox = (c%2 === 0) ? -0.1 : 0.1;
        const oz = (c > 2) ? -0.1 : 0.1;
        coco.position.set(-0.7 + ox, 0.98 + (c > 3 ? 0.08 : 0), 0.4 + oz);
        coco.castShadow = true;
        shop.add(coco);
      }

      // Mangoes in crate 2
      for (let m = 0; m < 6; m++) {
        const mango = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), mangoMat);
        mango.scale.set(1.0, 1.3, 1.0);
        const ox = -0.15 + (m % 3) * 0.15;
        const oz = -0.1 + Math.floor(m / 3) * 0.2;
        mango.position.set(0.5 + ox, 0.96, 0.4 + oz);
        mango.castShadow = true;
        shop.add(mango);
      }
    });

    const npcAbu = createCharacter(THREE, { handle: "abu", shirtColor: "#ea580c", pantColor: "#cbd5e1" });
    npcAbu.position.set(100.0, 0, 18);
    npcAbu.rotation.y = -Math.PI / 2;
    marketGroup.add(npcAbu);
    marketNPCs.push({ mesh: npcAbu, type: "shopkeeper", defaultFacing: -Math.PI / 2, animState: "idle", time: Math.random() * 100 });

    interactables.push({
      x: 98.5, z: 18, radius: 2.2,
      message: "Press [E] to talk to Abu (Fruit Vendor)",
      action: () => onInteract({
        type: "npc_chat",
        name: "Abu the Fruit Vendor",
        message: "Sweet tender coconuts! Sip on one to refresh your brain cells while compiling massive Rust crates."
      })
    });

    // ── PLAZA STREET DECORATIONS & CAFE TABLES ────────────────────────────

    // Cafe Tables
    const matIron = new THREE.MeshToonMaterial({ color: 0x1f2937 });
    function spawnCafeTable(tx, tz) {
      const tableGroup = new THREE.Group();
      tableGroup.position.set(tx, 0, tz);

      // Table Top
      const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 12), matWood);
      topMesh.position.y = 0.725;
      topMesh.castShadow = true;
      tableGroup.add(topMesh);

      // Table Leg
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), matIron);
      legMesh.position.y = 0.35;
      legMesh.castShadow = true;
      tableGroup.add(legMesh);

      // Table Base
      const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 8), matIron);
      baseMesh.position.y = 0.02;
      baseMesh.receiveShadow = true;
      tableGroup.add(baseMesh);

      // Cups on table
      const teaCup = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 6), new THREE.MeshToonMaterial({ color: 0xccffcc }));
      teaCup.position.set(0.2, 0.77, 0.15);
      tableGroup.add(teaCup);

      const teaCup2 = teaCup.clone();
      teaCup2.material = new THREE.MeshToonMaterial({ color: 0xffcccc });
      teaCup2.position.set(-0.25, 0.77, -0.2);
      tableGroup.add(teaCup2);

      // Stools (4 around table)
      const stoolAngles = [0, Math.PI/2, Math.PI, -Math.PI/2];
      stoolAngles.forEach(ang => {
        const sx = Math.sin(ang) * 0.9;
        const sz = Math.cos(ang) * 0.9;

        const stoolTop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 8), matWood);
        stoolTop.position.set(sx, 0.42, sz);
        stoolTop.castShadow = true;
        
        const stoolLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), matIron);
        stoolLeg.position.set(sx, 0.2, sz);
        stoolLeg.castShadow = true;

        tableGroup.add(stoolTop, stoolLeg);
      });

      marketGroup.add(tableGroup);
      structures.push({ x: tx, z: tz, radius: 1.1 });
    }

    spawnCafeTable(85, -8);
    spawnCafeTable(85, 8);

    // Stacked Barrels & Crates in Corners
    const matBarrel = new THREE.MeshToonMaterial({ color: 0x8b5a2b });
    function spawnBarrelStack(bx, bz) {
      const b1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 10), matBarrel);
      b1.position.set(bx, 0.45, bz);
      b1.castShadow = true;
      const b2 = b1.clone();
      b2.position.set(bx + 0.65, 0.45, bz + 0.2);
      const b3 = b1.clone();
      b3.position.set(bx + 0.3, 1.25, bz + 0.1);
      b3.rotation.z = Math.PI / 2;

      marketGroup.add(b1, b2, b3);
      structures.push({ x: bx + 0.3, z: bz + 0.1, radius: 0.8 });
    }

    spawnBarrelStack(79, -32);
    spawnBarrelStack(91, 30);

    // ── MARKET STREET LANTERNS (WITH GLOWING LIGHTS) ───────────────────────
    function spawnMarketLantern(lx, lz) {
      const postGroup = new THREE.Group();
      postGroup.position.set(lx, 0, lz);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.2, 8), matMetal);
      post.position.y = 1.6;
      post.castShadow = true;
      postGroup.add(post);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.05), matMetal);
      bar.position.set(0, 3.0, 0);
      postGroup.add(bar);

      const latGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.25, 6);
      const latMat = new THREE.MeshToonMaterial({ color: 0xeab308, emissive: 0xeab308, emissiveIntensity: 0.8 });
      const lantern = new THREE.Mesh(latGeo, latMat);
      lantern.position.set(0, 2.8, 0);
      postGroup.add(lantern);

      const light = new THREE.PointLight(0xffaa44, 0.9, 10.0);
      light.position.set(0, 2.7, 0);
      postGroup.add(light);

      marketGroup.add(postGroup);
      structures.push({ x: lx, z: lz, radius: 0.3 });
    }

    spawnMarketLantern(81, -22);
    spawnMarketLantern(89, -22);
    spawnMarketLantern(81, 22);
    spawnMarketLantern(89, 22);

    // ── HANGING BUNTING FLAGS (CROSSING THE STREET) ───────────────────────
    createBuntingString(THREE, new THREE.Vector3(73.5, 2.45, -18), new THREE.Vector3(96.5, 2.45, -18), marketGroup);
    createBuntingString(THREE, new THREE.Vector3(73.5, 2.45, 0), new THREE.Vector3(96.5, 2.45, 0), marketGroup);
    createBuntingString(THREE, new THREE.Vector3(73.5, 2.45, 18), new THREE.Vector3(96.5, 2.45, 18), marketGroup);
    createBuntingString(THREE, new THREE.Vector3(73.5, 2.45, -18), new THREE.Vector3(96.5, 2.45, 0), marketGroup);
    createBuntingString(THREE, new THREE.Vector3(73.5, 2.45, 0), new THREE.Vector3(96.5, 2.45, 18), marketGroup);

    // ── CUSTOMER NPCs (SITTING & WALKING) ──────────────────────────────────
    const npcAppu = createCharacter(THREE, { handle: "appu", shirtColor: "#3b82f6", pantColor: "#1e3a8a" });
    npcAppu.position.set(85, 0, -8.9); 
    npcAppu.rotation.y = 0; 
    marketGroup.add(npcAppu);
    marketNPCs.push({ mesh: npcAppu, type: "customer_sit", animState: "sit", time: Math.random() * 100 });

    const npcRadha = createCharacter(THREE, { handle: "radha", shirtColor: "#ec4899", pantColor: "#374151" });
    npcRadha.position.set(85, 0, 7.1); 
    npcRadha.rotation.y = 0;
    marketGroup.add(npcRadha);
    marketNPCs.push({ mesh: npcRadha, type: "customer_sit", animState: "sit", time: Math.random() * 100 });

    const npcAnu = createCharacter(THREE, { handle: "anu", shirtColor: "#06b6d4", pantColor: "#1f2937" });
    npcAnu.position.set(80, 0, -2);
    npcAnu.rotation.y = -Math.PI / 3; 
    marketGroup.add(npcAnu);
    marketNPCs.push({ mesh: npcAnu, type: "shopkeeper", defaultFacing: -Math.PI / 3, animState: "idle", time: Math.random() * 100 }); 

    interactables.push({
      x: 80.0, z: -2, radius: 1.5,
      message: "Press [E] to talk to Anu",
      action: () => onInteract({
        type: "npc_chat",
        name: "Anu the Shopper",
        message: "Devi's spices are the best in the district! I'm buying some cardamom to make biryani tonight."
      })
    });

    const npcManu = createCharacter(THREE, { handle: "manu", shirtColor: "#a855f7", pantColor: "#cbd5e1" });
    npcManu.position.set(86.5, 0, 20);
    npcManu.rotation.y = Math.PI; 
    marketGroup.add(npcManu);
    marketNPCs.push({
      mesh: npcManu,
      type: "customer_walk",
      speed: 1.8,
      direction: 1, 
      minZ: 14,
      maxZ: 32,
      animState: "walk",
      time: Math.random() * 100
    });

    townGroup.add(marketGroup);
  }
  createKeralaMarketplace();

  // ── PROJECT EXHIBITION HALL ─────────────────────────────────────────────
  function createProjectExhibitionHall() {
    const hallGroup = new THREE.Group();
    hallGroup.name = "projectExhibitionHall";
    hallGroup.position.set(-75, 0, 0); 

    const matWalls = new THREE.MeshToonMaterial({ color: 0xf4f1ea }); 
    const roofTex = createMarketRoofTexture(THREE);
    const matRoof = new THREE.MeshToonMaterial({ map: roofTex }); 
    const matWood = new THREE.MeshToonMaterial({ color: 0x513528 }); 
    const matGlow = new THREE.MeshToonMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.6 }); 

    const foundation = new THREE.Mesh(new THREE.BoxGeometry(22, 0.4, 16), matWalls);
    foundation.position.y = 0.2;
    foundation.receiveShadow = true;
    hallGroup.add(foundation);

    // Nalukettu Courtyard Pillars layout (4 outer, 4 inner)
    const pillarPositions = [
      { x: -10, z: -7 }, { x: 10, z: -7 }, { x: -10, z: 7 }, { x: 10, z: 7 }, // outer corners
      { x: -5, z: -3.5 }, { x: 5, z: -3.5 }, { x: -5, z: 3.5 }, { x: 5, z: 3.5 }  // inner corners around Nadumuttam
    ];
    pillarPositions.forEach(p => {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.4, 8), matWood);
      pillar.position.set(p.x, 2.1, p.z);
      pillar.castShadow = true;
      hallGroup.add(pillar);
    });

    // Courtyard (Nadumuttam) in the center
    const courtyardMat = new THREE.MeshToonMaterial({ color: 0x223e25 }); // dark central grass/soil bed
    const courtyard = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.08, 5.0), courtyardMat);
    courtyard.position.set(0, 0.21, 0);
    courtyard.receiveShadow = true;
    hallGroup.add(courtyard);

    // Decorative brass Nilavilakku lamp in Nadumuttam center
    const brassMat = new THREE.MeshToonMaterial({ color: 0xd4af37 });
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), brassMat);
    lampStem.position.set(0, 0.5, 0);
    lampStem.castShadow = true;
    const lampTop = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), brassMat);
    lampTop.position.set(0, 0.76, 0);
    
    // Tiny burning flame glow
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), flameMat);
    flame.position.set(0, 0.83, 0);
    
    const lampLight = new THREE.PointLight(0xffaa44, 0.8, 3.0);
    lampLight.position.set(0, 0.9, 0);
    
    courtyard.add(lampStem, lampTop, flame, lampLight);

    const roofBase = new THREE.Mesh(new THREE.BoxGeometry(23.6, 0.2, 17.6), matWood);
    roofBase.position.y = 3.9;
    hallGroup.add(roofBase);

    const roof1 = new THREE.Mesh(new THREE.BoxGeometry(24, 0.15, 10), matRoof);
    roof1.position.set(0, 4.8, -4.5);
    roof1.rotation.x = -0.4;
    roof1.castShadow = true;

    const roof2 = roof1.clone();
    roof2.position.z = 4.5;
    roof2.rotation.x = 0.4;
    hallGroup.add(roof1, roof2);

    const banner = new THREE.Mesh(new THREE.BoxGeometry(6.0, 1.0, 0.1), matWood);
    banner.position.set(0, 3.2, 8.0);
    banner.castShadow = true;
    hallGroup.add(banner);

    const signMat = new THREE.MeshToonMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.2 });
    const signPlate = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.5, 0.05), signMat);
    signPlate.position.set(0, 3.2, 8.06);
    hallGroup.add(signPlate);

    // Collision setup: Add individual collisions for each pillar so player can walk inside
    pillarPositions.forEach(p => {
      structures.push({ x: -75 + p.x, z: p.z, radius: 0.35 });
    });

    if (members.length > 0) {
      const radius = 5.2;
      const matPedBase = new THREE.MeshToonMaterial({ color: 0x4b5563 }); 

      members.forEach((member, i) => {
        const angle = (i * Math.PI * 2) / members.length;
        const localX = Math.sin(angle) * radius;
        const localZ = Math.cos(angle) * radius;

        const pGroup = new THREE.Group();
        pGroup.position.set(localX, 0.4, localZ);

        const base = createToonMesh(THREE, new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8), matPedBase, 0.02);
        base.position.y = 0.6;
        pGroup.add(base);

        const tablet = createToonMesh(THREE, new THREE.BoxGeometry(0.7, 0.45, 0.08), matWood, 0.02);
        tablet.position.set(0, 1.25, 0);
        tablet.rotation.x = -0.4;
        pGroup.add(tablet);

        const screen = createToonMesh(THREE, new THREE.BoxGeometry(0.62, 0.38, 0.02), matGlow, 0);
        screen.position.set(0, 1.25, 0.04);
        screen.rotation.x = -0.4;
        pGroup.add(screen);

        hallGroup.add(pGroup);

        const absX = -75 + localX;
        const absZ = 0 + localZ;

        interactables.push({
          x: absX, z: absZ, radius: 1.5,
          message: `Press [E] to view ${member.name}'s Projects`,
          action: () => onInteract({ type: "project_showcase", member: member })
        });
      });
    }

    townGroup.add(hallGroup);
  }
  createProjectExhibitionHall();

  // ── 8. HALL OF FAME ────────────────────────────────────────────────────
  function createHallOfFame() {
    const hofGroup = new THREE.Group();
    hofGroup.position.set(0, 0, 162);

    const matWalls = new THREE.MeshToonMaterial({ color: 0xf3f4f6 }); // White concrete
    const matRoof = new THREE.MeshToonMaterial({ color: 0x991b1b }); // Red roof tiles
    const matColumns = new THREE.MeshToonMaterial({ color: 0xe5e7eb }); // Light gray pillars
    const matGold = new THREE.MeshToonMaterial({ color: 0xd97706, emissive: 0xd97706, emissiveIntensity: 0.3 });
    const matMetal = new THREE.MeshToonMaterial({ color: 0x4b5563 });
    const matBanner = new THREE.MeshToonMaterial({ color: 0x991b1b }); // Red banners

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
    const clockFace = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16), new THREE.MeshToonMaterial({ color: 0xffffff }));
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

    townGroup.add(hofGroup);
    structures.push({ x: 0, z: 162, radius: 11.0 });

    // ── Podiums ──
    const podiumZ = 146;

    // Gold (Center)
    const goldP = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 1.2, 8), matGold);
    goldP.position.set(0, 0.6, podiumZ);
    goldP.castShadow = true;
    townGroup.add(goldP);
    structures.push({ x: 0, z: podiumZ, radius: 0.95 });

    // Silver (Left)
    const silverP = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.8, 8), new THREE.MeshToonMaterial({ color: 0xd1d5db }));
    silverP.position.set(-2.5, 0.4, podiumZ);
    silverP.castShadow = true;
    townGroup.add(silverP);
    structures.push({ x: -2.5, z: podiumZ, radius: 0.95 });

    // Bronze (Right)
    const bronzeP = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 0.4, 8), new THREE.MeshToonMaterial({ color: 0xcd7f32 }));
    bronzeP.position.set(2.5, 0.2, podiumZ);
    bronzeP.castShadow = true;
    townGroup.add(bronzeP);
    structures.push({ x: 2.5, z: podiumZ, radius: 0.95 });

    // Spawning characters on podiums (Gold, Silver, Bronze)
    // Gold
    if (members.length > 0) {
      const top1 = createCharacter(THREE, { handle: members[0].handle, tags: members[0].tags });
      top1.position.set(0, 1.2, podiumZ);
      top1.scale.set(0.85, 0.85, 0.85);
      townGroup.add(top1);
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
      townGroup.add(top2);
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
      townGroup.add(top3);
      podiumCharacters.push({ mesh: top3, animState: "idle", time: Math.random() * 100 });

      interactables.push({
        x: 2.5, z: podiumZ, radius: 1.6,
        message: `Press [E] to view Third-place ${members[2].name}'s Passport`,
        action: () => onInteract({ type: "passport", member: members[2] })
      });
    }

    // Leaderboard scoreboard plaque
    const plaqueMat = new THREE.MeshToonMaterial({ color: 0x1f2937 });
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
    
    townGroup.add(plaqueGGroup);
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

      // Warm Ceiling Light
      const roomLight = new THREE.PointLight(0xffebd8, 1.2, 20);
      roomLight.position.set(0, 5.0, 120);
      roomLight.castShadow = true;
      interior.add(roomLight);

      // Warm Golden Ambient lighting inside the room
      ambient.color.setHex(0xfff5ea);
      ambient.intensity = 0.95;

      activeWorkshop = {
        group: interior,
        member: member,
        styleType: interest
      };

      structures = [
        { x: 0, z: 120 - 4.8, radius: 1.4 }, // Desk
        { x: -5.4, z: 120, radius: 1.0 }     // Bookshelf
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
      townGroup.visible = false;

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

      // Restore Ambient Light to daylight settings
      ambient.color.setHex(0xffffff);
      ambient.intensity = 0.85;

      currentViewState = "town";
      sun.visible = true;
      townGroup.visible = true;

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
      marketNPCs = [];
      
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
      // Animate flowing backwater river water
      if (riverTex) {
        riverTex.offset.y += dt * 0.06;
        riverTex.offset.x = Math.sin(totalTime * 0.8) * 0.015;
      }

      // Float low-poly clouds
      const clouds = scene.getObjectByName("clouds");
      if (clouds) {
        clouds.children.forEach(cloud => {
          cloud.position.x += cloud.userData.speed * dt;
          if (cloud.position.x > 140) {
            cloud.position.x = -140;
          }
        });
      }

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

      // Animate marketplace NPCs
      marketNPCs.forEach(npc => {
        npc.time += dt;

        if (npc.type === "shopkeeper") {
          const dx = playerController.mesh.position.x - npc.mesh.position.x;
          const dz = playerController.mesh.position.z - npc.mesh.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < 4.8) {
            const targetAngle = Math.atan2(dx, dz);
            let angleDiff = targetAngle - npc.mesh.rotation.y;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            npc.mesh.rotation.y += angleDiff * 0.1;

            npc.animState = "wave";
          } else {
            let angleDiff = npc.defaultFacing - npc.mesh.rotation.y;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            npc.mesh.rotation.y += angleDiff * 0.05;

            npc.animState = "idle";
          }
        } 
        else if (npc.type === "customer_walk") {
          npc.mesh.position.z += npc.speed * npc.direction * dt;
          if (npc.mesh.position.z > npc.maxZ) {
            npc.direction = -1;
            npc.mesh.rotation.y = Math.PI; // Face south
          } else if (npc.mesh.position.z < npc.minZ) {
            npc.direction = 1;
            npc.mesh.rotation.y = 0; // Face north
          }
          npc.animState = "walk";
        }
        else if (npc.type === "customer_sit") {
          npc.animState = "sit";
        }

        animateCharacter(npc.mesh, npc.animState, npc.time, 1.0);
      });

      // Permanent Bright, Sunny Day Settings
      sun.intensity = 1.4;
      ambient.intensity = 0.40; // Reduced for realistic shadow contrast
      scene.background.setHex(0xffdcb8);
      scene.fog.color.setHex(0xffdcb8);
      scene.fog.density = 0.0035;

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
