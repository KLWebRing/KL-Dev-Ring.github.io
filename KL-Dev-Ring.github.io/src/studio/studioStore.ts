// ── KL DevVerse — Studio Store ───────────────────────────────────────
// Client-side state for the Builder Studio system.

import { create } from 'zustand';
import type { BuilderStudio, StudioFurniture, ProjectDisplay, StudioVisit } from '@/shared/types';

interface StudioState {
  // Current studio being viewed/edited
  readonly currentStudio: BuilderStudio | null;
  readonly isInStudio: boolean;
  readonly isOwner: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;

  // Actions
  setCurrentStudio: (studio: BuilderStudio, isOwner: boolean) => void;
  enterStudio: (studio: BuilderStudio, isOwner: boolean) => void;
  leaveStudio: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Studio modifications (optimistic updates)
  updateStudioSettings: (settings: Partial<BuilderStudio>) => void;
  setFurniture: (furniture: readonly StudioFurniture[]) => void;
  setProjectWall: (projects: readonly ProjectDisplay[]) => void;

  // Visitors
  readonly recentVisitors: readonly StudioVisit[];
  setRecentVisitors: (visitors: readonly StudioVisit[]) => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  currentStudio: null,
  isInStudio: false,
  isOwner: false,
  isLoading: false,
  error: null,
  recentVisitors: [],

  setCurrentStudio: (studio, isOwner) => set({
    currentStudio: studio,
    isOwner,
    error: null,
  }),

  enterStudio: (studio, isOwner) => set({
    currentStudio: studio,
    isInStudio: true,
    isOwner,
    isLoading: false,
    error: null,
  }),

  leaveStudio: () => set({
    isInStudio: false,
    currentStudio: null,
    isOwner: false,
    recentVisitors: [],
  }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  updateStudioSettings: (settings) => set((state) => ({
    currentStudio: state.currentStudio
      ? { ...state.currentStudio, ...settings }
      : null,
  })),

  setFurniture: (furniture) => set((state) => ({
    currentStudio: state.currentStudio
      ? { ...state.currentStudio, furniture }
      : null,
  })),

  setProjectWall: (projectWall) => set((state) => ({
    currentStudio: state.currentStudio
      ? { ...state.currentStudio, projectWall }
      : null,
  })),

  setRecentVisitors: (recentVisitors) => set({ recentVisitors }),
}));
