// ── KL DevVerse — NPC Definition ────────────────────────────────────
// Type definitions for NPC system — schedule, dialogue, behavior.
// Architecture only — no AI logic.

import type { DistrictId } from '@/world/engine/WorldConfig';
import type { TimePhase } from '@/world/engine/WorldClock';

// ── NPC Role ────────────────────────────────────────────────────────

export type NPCRole =
  | 'shopkeeper'
  | 'guard'
  | 'wanderer'
  | 'resident'
  | 'festival_npc'
  | 'quest_giver'
  | 'mentor'
  ;

// ── Schedule Slot ───────────────────────────────────────────────────

export interface NPCScheduleSlot {
  readonly timePhase: TimePhase;
  readonly position: { readonly x: number; readonly y: number; readonly z: number };
  readonly animation: string;
  readonly facing?: number; // rotation Y
}

// ── Dialogue ────────────────────────────────────────────────────────

export interface DialogueNode {
  readonly id: string;
  readonly text: string;
  readonly responses?: readonly {
    readonly label: string;
    readonly nextNodeId: string;
  }[];
}

export interface NPCDialogue {
  readonly startNodeId: string;
  readonly nodes: readonly DialogueNode[];
}

// ── NPC Full Definition ─────────────────────────────────────────────

export interface NPCFullDef {
  readonly id: string;
  readonly name: string;
  readonly role: NPCRole;
  readonly districtId: DistrictId;
  readonly schedule: readonly NPCScheduleSlot[];
  readonly dialogue?: NPCDialogue;
  readonly appearance: {
    readonly handle: string;
    readonly tags?: string[];
    readonly scale?: number;
  };
  /** Patrol waypoints for wanderer NPCs */
  readonly patrol?: readonly { readonly x: number; readonly z: number }[];
}
