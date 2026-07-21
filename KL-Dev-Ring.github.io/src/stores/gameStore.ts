// ── KL DevVerse — Game State Store ───────────────────────────────────
// Central game state: player, view, interaction, input.

import { create } from 'zustand';
import type { AnimationState, ViewState, ActiveWorkshop, InteractableItem } from '@/shared/types';

interface PlayerState {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly velocityY: number;
  readonly isGrounded: boolean;
  readonly isSprinting: boolean;
  readonly animState: AnimationState;
}

interface InputState {
  readonly forward: boolean;
  readonly backward: boolean;
  readonly left: boolean;
  readonly right: boolean;
  readonly sprint: boolean;
  readonly jump: boolean;
  readonly interact: boolean;
}

interface GameState {
  // Player
  player: PlayerState;
  setPlayer: (partial: Partial<PlayerState>) => void;

  // View
  viewState: ViewState;
  setViewState: (state: ViewState) => void;

  // Workshop
  activeWorkshop: ActiveWorkshop | null;
  setActiveWorkshop: (workshop: ActiveWorkshop | null) => void;

  // Input
  input: InputState;
  setInput: (partial: Partial<InputState>) => void;

  // Interaction
  nearestInteractable: InteractableItem | null;
  setNearestInteractable: (item: InteractableItem | null) => void;

  // Time
  elapsedTime: number;
  setElapsedTime: (time: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Player defaults
  player: {
    x: 0,
    y: 0.35,
    z: 12,
    yaw: 0,
    velocityY: 0,
    isGrounded: true,
    isSprinting: false,
    animState: 'idle',
  },
  setPlayer: (partial) =>
    set((state) => ({ player: { ...state.player, ...partial } })),

  // View
  viewState: 'town',
  setViewState: (viewState) => set({ viewState }),

  // Workshop
  activeWorkshop: null,
  setActiveWorkshop: (activeWorkshop) => set({ activeWorkshop }),

  // Input
  input: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    interact: false,
  },
  setInput: (partial) =>
    set((state) => ({ input: { ...state.input, ...partial } })),

  // Interaction
  nearestInteractable: null,
  setNearestInteractable: (nearestInteractable) => set({ nearestInteractable }),

  // Time
  elapsedTime: 0,
  setElapsedTime: (elapsedTime) => set({ elapsedTime }),
}));
