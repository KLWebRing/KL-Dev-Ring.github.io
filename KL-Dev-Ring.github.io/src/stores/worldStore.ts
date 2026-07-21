// ── KL DevVerse — World Data Store ───────────────────────────────────
// Holds the loaded network data, member list, and world entity registries.

import { create } from 'zustand';
import type { NetworkData, Member, Structure, InteractableItem, NPCConfig, ResidentConfig } from '@/shared/types';

interface WorldState {
  // Network data from build pipeline
  networkData: NetworkData | null;
  setNetworkData: (data: NetworkData) => void;

  // Convenience accessor
  members: readonly Member[];

  // Entity registries (mutable during gameplay)
  structures: Structure[];
  setStructures: (structures: Structure[]) => void;
  addStructure: (structure: Structure) => void;

  interactables: InteractableItem[];
  setInteractables: (items: InteractableItem[]) => void;
  addInteractable: (item: InteractableItem) => void;

  npcs: NPCConfig[];
  setNPCs: (npcs: NPCConfig[]) => void;
  addNPC: (npc: NPCConfig) => void;

  residents: ResidentConfig[];
  setResidents: (residents: ResidentConfig[]) => void;
  addResident: (resident: ResidentConfig) => void;

  // Data loading
  isLoading: boolean;
  loadError: string | null;
  fetchNetworkData: () => Promise<void>;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  networkData: null,
  setNetworkData: (data) => set({ networkData: data, members: data.nodes }),

  members: [],

  structures: [],
  setStructures: (structures) => set({ structures }),
  addStructure: (structure) =>
    set((state) => ({ structures: [...state.structures, structure] })),

  interactables: [],
  setInteractables: (interactables) => set({ interactables }),
  addInteractable: (item) =>
    set((state) => ({ interactables: [...state.interactables, item] })),

  npcs: [],
  setNPCs: (npcs) => set({ npcs }),
  addNPC: (npc) =>
    set((state) => ({ npcs: [...state.npcs, npc] })),

  residents: [],
  setResidents: (residents) => set({ residents }),
  addResident: (resident) =>
    set((state) => ({ residents: [...state.residents, resident] })),

  isLoading: true,
  loadError: null,

  fetchNetworkData: async () => {
    set({ isLoading: true, loadError: null });
    try {
      const response = await fetch('./data/network.json');
      if (!response.ok) {
        throw new Error(`Failed to load network data: ${response.status}`);
      }
      const data = (await response.json()) as NetworkData;
      set({
        networkData: data,
        members: data.nodes,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to load network registry:', message);
      set({
        isLoading: false,
        loadError: message,
        members: [],
      });
    }
  },
}));
