// ── KL DevVerse — House Store ────────────────────────────────────────
// Client-side state for the house system.

import { create } from 'zustand';
import type { House, PlacedFurniture, ProjectDisplay, HouseVisit } from '@/shared/types';

interface HouseState {
  // Current house being viewed/edited
  readonly currentHouse: House | null;
  readonly isInHouse: boolean;
  readonly isOwner: boolean;
  readonly isLoading: boolean;
  readonly error: string | null;

  // Actions
  setCurrentHouse: (house: House, isOwner: boolean) => void;
  enterHouse: (house: House, isOwner: boolean) => void;
  leaveHouse: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // House modifications (optimistic updates)
  updateHouseSettings: (settings: Partial<House>) => void;
  setFurniture: (furniture: readonly PlacedFurniture[]) => void;
  setProjectWall: (projects: readonly ProjectDisplay[]) => void;

  // Visitors
  readonly recentVisitors: readonly HouseVisit[];
  setRecentVisitors: (visitors: readonly HouseVisit[]) => void;
}

export const useHouseStore = create<HouseState>((set) => ({
  currentHouse: null,
  isInHouse: false,
  isOwner: false,
  isLoading: false,
  error: null,
  recentVisitors: [],

  setCurrentHouse: (house, isOwner) => set({
    currentHouse: house,
    isOwner,
    error: null,
  }),

  enterHouse: (house, isOwner) => set({
    currentHouse: house,
    isInHouse: true,
    isOwner,
    isLoading: false,
    error: null,
  }),

  leaveHouse: () => set({
    isInHouse: false,
    currentHouse: null,
    isOwner: false,
    recentVisitors: [],
  }),

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  updateHouseSettings: (settings) => set((state) => ({
    currentHouse: state.currentHouse
      ? { ...state.currentHouse, ...settings }
      : null,
  })),

  setFurniture: (furniture) => set((state) => ({
    currentHouse: state.currentHouse
      ? { ...state.currentHouse, furniture }
      : null,
  })),

  setProjectWall: (projectWall) => set((state) => ({
    currentHouse: state.currentHouse
      ? { ...state.currentHouse, projectWall }
      : null,
  })),

  setRecentVisitors: (recentVisitors) => set({ recentVisitors }),
}));
