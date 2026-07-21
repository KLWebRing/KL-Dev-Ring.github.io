// ── KL DevVerse — House Scene ────────────────────────────────────────
// R3F component that renders the house interior.
// Replaces WorldScene when viewState is 'house'.

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Group, PointLight, AmbientLight } from 'three';
import { createHouseInterior, HOUSE_FURNITURE_SLOTS } from '@/house/HouseInterior';
import { createFurnitureMesh } from '@/house/FurnitureRenderer';
import { useHouseStore } from '@/house/houseStore';
import { HOUSE } from '@/shared/constants';
import type { PlacedFurniture, HouseTheme } from '@/shared/types';

export function HouseScene(): null {
  const { scene } = useThree();
  const houseGroupRef = useRef<Group | null>(null);
  const furnitureGroupRef = useRef<Group | null>(null);

  const house = useHouseStore(s => s.currentHouse);
  const isInHouse = useHouseStore(s => s.isInHouse);

  useEffect(() => {
    if (!isInHouse || !house) return;

    // Clean up any previous house
    if (houseGroupRef.current) {
      scene.remove(houseGroupRef.current);
    }

    // ── Build Interior ──────────────────────────────────────────────
    const interiorGroup = createHouseInterior(house.theme as HouseTheme);
    interiorGroup.name = 'houseScene';
    scene.add(interiorGroup);
    houseGroupRef.current = interiorGroup;

    // ── Interior Lighting ───────────────────────────────────────────
    const mainLight = new PointLight(0xfff4e0, 1.2, 15, 0.5);
    mainLight.position.set(0, HOUSE.INTERIOR_HEIGHT - 0.5, 0);
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

    placeFurniture(furnGroup, house.furniture);

    // ── Owner Name Label (on back wall) ─────────────────────────────
    // TODO: Canvas texture for owner name — deferred to polish step

    return () => {
      if (houseGroupRef.current) {
        scene.remove(houseGroupRef.current);
        houseGroupRef.current = null;
      }
    };
  }, [isInHouse, house, scene]);

  // Update furniture when placement changes
  useEffect(() => {
    if (!furnitureGroupRef.current || !house) return;
    // Clear and re-place
    const group = furnitureGroupRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]!);
    }
    placeFurniture(group, house.furniture);
  }, [house?.furniture]);

  return null;
}

/**
 * Place furniture meshes at their slot positions.
 */
function placeFurniture(group: Group, furniture: readonly PlacedFurniture[]): void {
  for (const placed of furniture) {
    const mesh = createFurnitureMesh(placed.itemId, placed.variant);
    if (!mesh) continue;

    // Find the slot definition for position
    const slot = HOUSE_FURNITURE_SLOTS.find(s => s.slotId === placed.slotId);
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
