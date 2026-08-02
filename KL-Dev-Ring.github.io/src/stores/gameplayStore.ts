// ── KL DevVerse — Gameplay Store ─────────────────────────────────────
// Zustand store managing all gameplay panel states.
// Single source of truth for which panels are open.

import { create } from 'zustand';

type GameplayPanel =
  | 'career'
  | 'reputation'
  | 'skills'
  | 'timeline'
  | 'leaderboard'
  | null;

interface GameplayState {
  // ── Panel Management ────────────────────────────────────────
  activePanel: GameplayPanel;
  openPanel: (panel: GameplayPanel) => void;
  closePanel: () => void;
  togglePanel: (panel: GameplayPanel) => void;

  // ── Quest Tracker ───────────────────────────────────────────
  questTrackerExpanded: boolean;
  toggleQuestTracker: () => void;

  // ── Stats Cache ─────────────────────────────────────────────
  stats: {
    totalMissions: number;
    totalQuests: number;
    skillPoints: number;
    reputation: number;
    rank: number;
    careerTitle: string;
  };
  setStats: (stats: Partial<GameplayState['stats']>) => void;
}

export const useGameplayStore = create<GameplayState>((set) => ({
  // Panel state
  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
  togglePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? null : panel,
    })),

  // Quest tracker
  questTrackerExpanded: true,
  toggleQuestTracker: () =>
    set((state) => ({ questTrackerExpanded: !state.questTrackerExpanded })),

  // Stats (populated on login / after actions)
  stats: {
    totalMissions: 0,
    totalQuests: 0,
    skillPoints: 0,
    reputation: 0,
    rank: 1,
    careerTitle: 'Beginner',
  },
  setStats: (partial) =>
    set((state) => ({ stats: { ...state.stats, ...partial } })),
}));
