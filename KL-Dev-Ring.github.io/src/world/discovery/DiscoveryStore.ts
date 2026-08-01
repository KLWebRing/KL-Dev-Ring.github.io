// ── KL DevVerse — Discovery Store ───────────────────────────────────
// Zustand store for player exploration progress.
// Persisted to localStorage.

import { create } from 'zustand';

interface DiscoveryState {
  /** Set of discovered landmark IDs */
  discoveredLandmarks: Set<string>;
  /** Set of visited scenic viewpoints */
  visitedViewpoints: Set<string>;
  /** Total discovery percentage (0..100) */
  discoveryProgress: number;

  // Actions
  discoverLandmark: (id: string, totalLandmarks: number) => void;
  visitViewpoint: (id: string) => void;
  isDiscovered: (id: string) => boolean;
  reset: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => {
  // Load from localStorage
  let initialLandmarks = new Set<string>();
  let initialViewpoints = new Set<string>();
  try {
    const stored = localStorage.getItem('kldevverse_discovery');
    if (stored) {
      const data = JSON.parse(stored);
      initialLandmarks = new Set(data.landmarks ?? []);
      initialViewpoints = new Set(data.viewpoints ?? []);
    }
  } catch { /* ignore */ }

  return {
    discoveredLandmarks: initialLandmarks,
    visitedViewpoints: initialViewpoints,
    discoveryProgress: 0,

    discoverLandmark: (id, totalLandmarks) => set(state => {
      if (state.discoveredLandmarks.has(id)) return state;
      const updated = new Set(state.discoveredLandmarks);
      updated.add(id);
      const progress = totalLandmarks > 0 ? (updated.size / totalLandmarks) * 100 : 0;
      persistDiscovery(updated, state.visitedViewpoints);
      return { discoveredLandmarks: updated, discoveryProgress: progress };
    }),

    visitViewpoint: (id) => set(state => {
      if (state.visitedViewpoints.has(id)) return state;
      const updated = new Set(state.visitedViewpoints);
      updated.add(id);
      persistDiscovery(state.discoveredLandmarks, updated);
      return { visitedViewpoints: updated };
    }),

    isDiscovered: (id) => get().discoveredLandmarks.has(id),

    reset: () => {
      localStorage.removeItem('kldevverse_discovery');
      set({
        discoveredLandmarks: new Set(),
        visitedViewpoints: new Set(),
        discoveryProgress: 0,
      });
    },
  };
});

function persistDiscovery(landmarks: Set<string>, viewpoints: Set<string>): void {
  try {
    localStorage.setItem('kldevverse_discovery', JSON.stringify({
      landmarks: [...landmarks],
      viewpoints: [...viewpoints],
    }));
  } catch { /* ignore */ }
}
