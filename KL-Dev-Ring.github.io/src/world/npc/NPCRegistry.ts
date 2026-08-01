// ── KL DevVerse — NPC Registry ──────────────────────────────────────
// Registry of all NPC definitions. District builders register NPCs here.

import type { NPCFullDef } from './NPCDefinition';

const npcs = new Map<string, NPCFullDef>();

export const npcRegistry = {
  register(npc: NPCFullDef): void {
    npcs.set(npc.id, npc);
  },

  get(id: string): NPCFullDef | undefined {
    return npcs.get(id);
  },

  getAll(): NPCFullDef[] {
    return [...npcs.values()];
  },

  getByDistrict(districtId: string): NPCFullDef[] {
    return [...npcs.values()].filter(n => n.districtId === districtId);
  },

  count(): number {
    return npcs.size;
  },
};
