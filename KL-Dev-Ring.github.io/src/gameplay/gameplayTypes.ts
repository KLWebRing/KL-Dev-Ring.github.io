// ── KL DevVerse — Gameplay Types ───────────────────────────────────────
// Shared types for the Developer Life Engine (Phase 6).

// ── Missions ─────────────────────────────────────────────────────────

export type MissionCategory = 
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'SEASONAL'
  | 'COMMUNITY'
  | 'HACKATHON'
  | 'EXPLORATION'
  | 'LEARNING'
  | 'PROJECT'
  | 'OPEN_SOURCE';

export type MissionState = 
  | 'LOCKED'
  | 'AVAILABLE'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'EXPIRED'
  | 'REWARDED';

export interface Mission {
  id: string;
  missionId: string;
  category: MissionCategory;
  name: string;
  description: string;
  requirements: string; // JSON string
  rewards: string;      // JSON string
  xpReward: number;
  cashReward: number;
  repReward: number;
  maxProgress: number;
  isActive: boolean;
  isRepeatable: boolean;
  minLevel: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;

  // Added by service
  state: MissionState;
  currentProgress: number;
  progressId?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}
