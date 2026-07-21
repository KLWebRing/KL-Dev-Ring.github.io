// ── KL DevVerse — House Manager ──────────────────────────────────────
// Handles house API calls and scene transitions.
// Bridges between the UI/store and the backend.

import { useHouseStore } from '@/house/houseStore';
import type { House } from '@/shared/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  return localStorage.getItem('kl_access_token');
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── House Manager (singleton-ish functional API) ────────────────────

export const houseManager = {
  /**
   * Load the current user's house (or create one).
   */
  async loadMyHouse(): Promise<House> {
    useHouseStore.getState().setLoading(true);
    try {
      const house = await apiFetch<House>('/api/house/mine');
      useHouseStore.getState().setCurrentHouse(house, true);
      return house;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load house';
      useHouseStore.getState().setError(msg);
      throw err;
    }
  },

  /**
   * Enter the current user's house.
   */
  async enterMyHouse(): Promise<void> {
    useHouseStore.getState().setLoading(true);
    try {
      const house = await apiFetch<House>('/api/house/mine');
      useHouseStore.getState().enterHouse(house, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enter house';
      useHouseStore.getState().setError(msg);
    }
  },

  /**
   * Visit another player's house.
   */
  async visitHouse(userId: string): Promise<void> {
    useHouseStore.getState().setLoading(true);
    try {
      const house = await apiFetch<House>(`/api/house/user/${userId}`);
      useHouseStore.getState().enterHouse(house, false);

      // Record the visit
      await apiFetch(`/api/house/${house.id}/visit`, { method: 'POST' }).catch(() => {
        // Non-critical — don't fail the visit
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to visit house';
      useHouseStore.getState().setError(msg);
    }
  },

  /**
   * Leave the current house and return to town.
   */
  leaveHouse(): void {
    useHouseStore.getState().leaveHouse();
  },

  /**
   * Update house settings (theme, name, etc.)
   */
  async updateSettings(settings: {
    name?: string;
    theme?: string;
    floorMat?: string;
    wallColor?: string;
    lightPreset?: string;
    isPublic?: boolean;
  }): Promise<void> {
    // Optimistic update
    useHouseStore.getState().updateHouseSettings(settings as Partial<House>);
    try {
      await apiFetch('/api/house/mine', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    } catch (err) {
      // Revert on failure — reload
      await this.loadMyHouse();
    }
  },

  /**
   * Place furniture in a slot.
   */
  async placeFurniture(itemId: string, slotId: string, variant = 'default'): Promise<void> {
    try {
      await apiFetch('/api/house/furniture', {
        method: 'POST',
        body: JSON.stringify({ itemId, slotId, variant }),
      });
      // Reload to get updated furniture list
      await this.loadMyHouse();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place furniture';
      useHouseStore.getState().setError(msg);
    }
  },

  /**
   * Pin a project to the display wall.
   */
  async pinProject(repoUrl: string, repoName: string, description: string, slotIndex: number): Promise<void> {
    try {
      await apiFetch('/api/house/projects', {
        method: 'POST',
        body: JSON.stringify({ repoUrl, repoName, description, slotIndex }),
      });
      await this.loadMyHouse();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to pin project';
      useHouseStore.getState().setError(msg);
    }
  },

  /**
   * Load recent visitors.
   */
  async loadVisitors(houseId: string): Promise<void> {
    try {
      const visitors = await apiFetch<Array<{ id: string; visitorId: string; visitedAt: string }>>(`/api/house/${houseId}/visitors`);
      useHouseStore.getState().setRecentVisitors(
        visitors.map(v => ({
          id: v.id,
          visitorId: v.visitorId,
          visitorName: '', // Would need a join — deferred
          visitorAvatar: '',
          visitedAt: v.visitedAt,
        })),
      );
    } catch {
      // Non-critical
    }
  },
};
