// ── KL DevVerse — Game Engine (R3F) ─────────────────────────────────
// The main Three.js/R3F scene. Lives inside a <Canvas> element.
// Orchestrates: scene setup, player, camera, world, NPCs, game loop.

import { useEffect, useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import {
  Group,
  DirectionalLight,
  AmbientLight,
  FogExp2,
  Color,
  Clock,
} from 'three';
import { PlayerController } from '@/core/player/PlayerController';
import { ThirdPersonCamera } from '@/core/camera/ThirdPersonCamera';
import { inputManager } from '@/core/input/InputManager';
import { interactionManager } from '@/core/interaction/InteractionManager';
import { useWorldStore } from '@/stores/worldStore';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';
import { COLORS, RENDER, WORLD } from '@/shared/constants';
import { createCharacter, animateCharacter } from '@/entities/character/characterSystem';

export function GameEngine(): null {
  const { scene, gl, size, set } = useThree();

  const playerGroupRef = useRef<Group | null>(null);
  const playerCtrlRef = useRef<PlayerController | null>(null);
  const cameraCtrlRef = useRef<ThirdPersonCamera | null>(null);
  const clockRef = useRef(new Clock());
  const charTimeRef = useRef(0);

  const { interactables } = useWorldStore();
  const { setPlayer, setNearestInteractable } = useGameStore();
  const { handleInteraction } = useUIStore();
  void handleInteraction; // used in WorldScene, referenced here to keep import

  // ── One-time scene setup ────────────────────────────────────────────
  useEffect(() => {
    // Sky & fog
    scene.background = new Color(COLORS.SKY_GOLDEN);
    scene.fog = new FogExp2(COLORS.FOG_GOLDEN, RENDER.FOG_DENSITY);
    scene.fog.color = scene.background as unknown as import('three').Color;

    // Lights
    const sun = new DirectionalLight(COLORS.SUN_WARM, 1.4);
    sun.position.set(30, 60, -20);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(RENDER.SHADOW_MAP_SIZE);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 250;
    sun.shadow.camera.left = -80;
    sun.shadow.camera.right = 80;
    sun.shadow.camera.top = 80;
    sun.shadow.camera.bottom = -80;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    scene.add(sun.target);

    const ambient = new AmbientLight(COLORS.AMBIENT, 0.4);
    scene.add(ambient);

    // Player character group
    const playerGroup = new Group();
    playerGroup.name = 'playerGroup';
    const character = createCharacter({ handle: 'player', scale: 0.85 });
    playerGroup.add(character);
    scene.add(playerGroup);
    playerGroupRef.current = playerGroup;

    // Player controller
    const ctrl = new PlayerController({
      group: playerGroup,
      getStructures: () => useWorldStore.getState().structures,
      cameraYaw: () => cameraCtrlRef.current?.yaw ?? 0,
    });
    ctrl.teleport(WORLD.SPAWN.x, WORLD.SPAWN.y, WORLD.SPAWN.z);
    playerCtrlRef.current = ctrl;

    // Camera — override the R3F default camera with our ThirdPersonCamera
    const camCtrl = new ThirdPersonCamera();
    camCtrl.updateAspect(size.width, size.height);
    set({ camera: camCtrl.camera });
    cameraCtrlRef.current = camCtrl;

    // Input
    inputManager.bind();
    inputManager.setInteractCallback(() => {
      const ctrl = playerCtrlRef.current;
      if (!ctrl) return;
      interactionManager.triggerNearest(ctrl.x, ctrl.z);
    });

    // Renderer settings
    gl.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.MAX_PIXEL_RATIO));
    gl.shadowMap.enabled = true;

    return () => {
      inputManager.unbind();
      scene.remove(playerGroup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync interactables to interaction manager ────────────────────────
  useEffect(() => {
    interactionManager.setItems(interactables);
  }, [interactables]);

  // ── Window resize ───────────────────────────────────────────────────
  useEffect(() => {
    cameraCtrlRef.current?.updateAspect(size.width, size.height);
  }, [size]);

  // ── Game loop ────────────────────────────────────────────────────────
  useFrame(() => {
    const dt = Math.min(clockRef.current.getDelta(), 0.1);
    const totalTime = clockRef.current.getElapsedTime();
    charTimeRef.current += dt;

    const ctrl = playerCtrlRef.current;
    const camCtrl = cameraCtrlRef.current;
    const playerGroup = playerGroupRef.current;
    if (!ctrl || !camCtrl || !playerGroup) return;

    // Input
    const input = inputManager.snapshot();
    const delta = input.mouseDelta;

    // Orbit camera
    if (delta.x !== 0 || delta.y !== 0) {
      camCtrl.applyDelta(delta.x, delta.y);
    }

    // Update player
    ctrl.update(dt, input);

    // Update camera
    camCtrl.update(
      dt,
      ctrl.x,
      ctrl.y,
      ctrl.z,
      ctrl.animState === 'run',
    );

    // Animate player character
    const charGroup = playerGroup.children[0];
    if (charGroup instanceof Group) {
      animateCharacter(charGroup, ctrl.animState, charTimeRef.current);
    }

    // Sync player state to store (throttled — only when values change meaningfully)
    setPlayer({
      x: ctrl.x,
      y: ctrl.y,
      z: ctrl.z,
      animState: ctrl.animState,
    });

    // Update nearest interactable
    const nearest = interactionManager.getNearest(ctrl.x, ctrl.z);
    setNearestInteractable(nearest);
  });

  // This component has no JSX output — it only side-effects the scene
  return null;
}
