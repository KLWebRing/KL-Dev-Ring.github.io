// ── KL DevVerse — NPC Spawner ───────────────────────────────────────
// Spawns NPC meshes at schedule-defined locations.
// Uses existing createCharacter() system.
// Future: schedule-based position changes, behavior trees.

import { Group } from 'three';
import { createCharacter } from '@/entities/character/characterSystem';
import { npcRegistry } from './NPCRegistry';
import type { NPCFullDef } from './NPCDefinition';
import type { WorldTimeState } from '@/world/engine/WorldClock';

// ── Spawned NPC State ───────────────────────────────────────────────

export interface SpawnedNPC {
  readonly def: NPCFullDef;
  readonly mesh: Group;
}

// ── NPC Spawner ─────────────────────────────────────────────────────

export class NPCSpawner {
  private spawned: SpawnedNPC[] = [];

  /**
   * Spawn all registered NPCs into the scene.
   * Uses the first schedule slot for initial position.
   */
  spawnAll(parentGroup: Group): SpawnedNPC[] {
    const allNPCs = npcRegistry.getAll();

    for (const def of allNPCs) {
      const mesh = createCharacter({
        handle: def.appearance.handle,
        tags: def.appearance.tags,
        scale: def.appearance.scale,
      });

      // Use first schedule slot for initial position
      const firstSlot = def.schedule[0];
      if (firstSlot) {
        mesh.position.set(firstSlot.position.x, firstSlot.position.y, firstSlot.position.z);
        if (firstSlot.facing !== undefined) {
          mesh.rotation.y = firstSlot.facing;
        }
      }

      parentGroup.add(mesh);
      this.spawned.push({ def, mesh });
    }

    return this.spawned;
  }

  /**
   * Update NPC positions based on current time phase.
   * Future: smooth interpolation between schedule positions.
   */
  updateSchedule(_worldTime: WorldTimeState): void {
    // Architecture placeholder — will be implemented when
    // NPC schedules are populated with actual data
  }

  getSpawned(): readonly SpawnedNPC[] {
    return this.spawned;
  }

  dispose(): void {
    this.spawned = [];
  }
}
