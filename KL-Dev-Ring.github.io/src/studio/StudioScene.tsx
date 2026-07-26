// ── KL DevVerse — Studio Scene ───────────────────────────────────────
// R3F component that renders the Builder Studio interior.
// Replaces WorldScene when viewState is 'studio'.

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Group, PointLight, AmbientLight } from 'three';
import { createStudioInterior, STUDIO_FURNITURE_SLOTS } from '@/studio/StudioInterior';
import { createFurnitureMesh } from '@/studio/FurnitureRenderer';
import { useStudioStore } from '@/studio/studioStore';
import { STUDIO } from '@/shared/constants';
import type { StudioFurniture, StudioTheme } from '@/shared/types';

export function StudioScene(): null {
  const { scene } = useThree();
  const studioGroupRef = useRef<Group | null>(null);
  const furnitureGroupRef = useRef<Group | null>(null);

  const studio = useStudioStore(s => s.currentStudio);
  const isInStudio = useStudioStore(s => s.isInStudio);

  useEffect(() => {
    if (!isInStudio || !studio) return;

    // Clean up any previous studio
    if (studioGroupRef.current) {
      scene.remove(studioGroupRef.current);
    }

    // ── Build Interior ──────────────────────────────────────────────
    const interiorGroup = createStudioInterior(studio.theme as StudioTheme);
    interiorGroup.name = 'studioScene';
    scene.add(interiorGroup);
    studioGroupRef.current = interiorGroup;

    // ── Interior Lighting ───────────────────────────────────────────
    const mainLight = new PointLight(0xfff4e0, 1.2, 15, 0.5);
    mainLight.position.set(0, STUDIO.INTERIOR_HEIGHT - 0.5, 0);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(512, 512);
    interiorGroup.add(mainLight);

    const ambient = new AmbientLight(0x404060, 0.4);
    interiorGroup.add(ambient);

    // Accent light near workspace
    const workLight = new PointLight(0x60a5fa, 0.4, 6, 1);
    workLight.position.set(-4, 2, -3);
    interiorGroup.add(workLight);

    // ── Place Furniture ─────────────────────────────────────────────
    const furnGroup = new Group();
    furnGroup.name = 'furnitureGroup';
    interiorGroup.add(furnGroup);
    furnitureGroupRef.current = furnGroup;

    placeFurniture(furnGroup, studio.furniture);

    // ── Owner Name Label (on back wall) ─────────────────────────────
    // TODO: Canvas texture for owner name — deferred to polish step

    return () => {
      if (studioGroupRef.current) {
        scene.remove(studioGroupRef.current);
        studioGroupRef.current = null;
      }
    };
  }, [isInStudio, studio, scene]);

  // Update furniture when placement changes
  useEffect(() => {
    if (!furnitureGroupRef.current || !studio) return;
    // Clear and re-place
    const group = furnitureGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]!);
    }
    placeFurniture(group, studio.furniture);
  }, [studio?.furniture]);

  return null;
}

/**
 * Place furniture meshes at their slot positions.
 */
function placeFurniture(group: Group, furniture: readonly StudioFurniture[]): void {
  for (const placed of furniture) {
    const mesh = createFurnitureMesh(placed.itemId, placed.variant);
    if (!mesh) continue;

    // Find the slot definition for position
    const slot = STUDIO_FURNITURE_SLOTS.find(s => s.slotId === placed.slotId);
    if (slot) {
      mesh.position.set(slot.posX, slot.posY, slot.posZ);
      mesh.rotation.y = slot.rotation + placed.rotation;
    } else {
      // Fallback to stored position
      mesh.position.set(placed.posX, 0, placed.posZ);
      mesh.rotation.y = placed.rotation;
    }

    mesh.name = `furn_${placed.slotId}`;
    group.add(mesh);
  }
}
