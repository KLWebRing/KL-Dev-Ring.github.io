// ── KL DevVerse — World Scene ────────────────────────────────────────
// Phase 4: Thin orchestrator that delegates to the District system.
// No longer contains inline geometry — all geometry lives in district
// definition files under world/districts/definitions/.
//
// Responsibilities:
// 1. Import district definitions (triggers self-registration)
// 2. Initialize the DistrictLoader with the R3F scene
// 3. Load all enabled districts
// 4. Wire world data (structures, interactables) into worldStore
// 5. Export NPC list for GameEngine animation

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useWorldStore } from '@/stores/worldStore';
import { useUIStore } from '@/stores/uiStore';
import { districtLoader } from '@/world/districts/DistrictLoader';
import type { NPCEntry } from '@/world/districts/DistrictRegistry';
import { createRiverTexture } from '@/graphics/materials';

// ── Import district definitions (self-registering) ──────────────────
import '@/world/districts/definitions/developerTown';
// Future districts will be imported here as they're implemented:
// import '@/world/districts/definitions/marketplace';
// import '@/world/districts/definitions/lakeside';
// etc.

// ── Exported NPC list for GameEngine animation ──────────────────────
export const worldNPCs: NPCEntry[] = [];

// ── Exported river texture for animation in game loop ───────────────
export let riverTexture: ReturnType<typeof createRiverTexture> | null = null;

export function WorldScene(): null {
  const { scene } = useThree();
  const { setStructures, setInteractables, members } = useWorldStore();
  const { handleInteraction } = useUIStore();

  useEffect(() => {
    // Reset NPC list
    worldNPCs.length = 0;

    // Initialize the district loader with the scene
    districtLoader.init(scene);

    // Wire up data change callback — when districts load/unload,
    // push aggregated data into worldStore
    districtLoader.setOnWorldDataChange((structures, interactables, npcs) => {
      setStructures(structures);
      setInteractables(interactables);

      // Sync NPC list for GameEngine animation
      worldNPCs.length = 0;
      worldNPCs.push(...npcs);
    });

    // Build context for district builders
    const ctx = {
      members,
      onInteract: (event: { type: string; [key: string]: unknown }) => {
        handleInteraction(event as Parameters<typeof handleInteraction>[0]);
      },
    };

    // Load all enabled districts
    districtLoader.loadAllEnabled(ctx);

    // Capture river texture from developer_town if loaded
    const devTown = districtLoader.getLoadedDistrict('developer_town');
    if (devTown?.riverTexture) {
      riverTexture = devTown.riverTexture;
    }

    return () => {
      districtLoader.dispose();
      worldNPCs.length = 0;
      riverTexture = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members.length]);

  return null;
}
