// ── KL DevVerse — Studio Manager ─────────────────────────────────────
// Handles Builder Studio API calls and scene transitions.
// Bridges between the UI/store and the backend.

import { useStudioStore } from '@/studio/studioStore';
import type { BuilderStudio } from '@/shared/types';

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

// ── Studio Manager (singleton-ish functional API) ───────────────────

export const studioManager = {
  /**
   * Load the current user's Builder Studio (or create one).
   */
  async loadMyStudio(): Promise<BuilderStudio> {
    useStudioStore.getState().setLoading(true);
    try {
      const studio = await apiFetch<BuilderStudio>('/api/studio/mine');
      useStudioStore.getState().setCurrentStudio(studio, true);
      return studio;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load studio';
      useStudioStore.getState().setError(msg);
      throw err;
    }
  },

  /**
   * Enter the current user's Builder Studio.
   */
  async enterMyStudio(): Promise<void> {
    useStudioStore.getState().setLoading(true);
    try {
      const studio = await apiFetch<BuilderStudio>('/api/studio/mine');
      useStudioStore.getState().enterStudio(studio, true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enter studio';
      useStudioStore.getState().setError(msg);
    }
  },

  /**
   * Visit another player's Builder Studio.
   */
  async visitStudio(userId: string): Promise<void> {
    useStudioStore.getState().setLoading(true);
    try {
      const studio = await apiFetch<BuilderStudio>(`/api/studio/user/${userId}`);
      useStudioStore.getState().enterStudio(studio, false);

      // Record the visit
      await apiFetch(`/api/studio/${studio.id}/visit`, { method: 'POST' }).catch(() => {
        // Non-critical — don't fail the visit
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to visit studio';
      useStudioStore.getState().setError(msg);
    }
  },

  /**
   * Leave the current studio and return to town.
   */
  leaveStudio(): void {
    useStudioStore.getState().leaveStudio();
  },

  /**
   * Update studio settings (theme, name, etc.)
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
    useStudioStore.getState().updateStudioSettings(settings as Partial<BuilderStudio>);
    try {
      await apiFetch('/api/studio/mine', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
    } catch {
      // Revert on failure — reload
      await this.loadMyStudio();
    }
  },

  /**
   * Place furniture in a slot.
   */
  async placeFurniture(itemId: string, slotId: string, variant = 'default'): Promise<void> {
    try {
      await apiFetch('/api/studio/furniture', {
        method: 'POST',
        body: JSON.stringify({ itemId, slotId, variant }),
      });
      // Reload to get updated furniture list
      await this.loadMyStudio();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to place furniture';
      useStudioStore.getState().setError(msg);
    }
  },

  /**
   * Pin a project to the display wall.
   */
  async pinProject(repoUrl: string, repoName: string, description: string, slotIndex: number): Promise<void> {
    try {
      await apiFetch('/api/studio/projects', {
        method: 'POST',
        body: JSON.stringify({ repoUrl, repoName, description, slotIndex }),
      });
      await this.loadMyStudio();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to pin project';
      useStudioStore.getState().setError(msg);
    }
  },

  /**
   * Load recent visitors.
   */
  async loadVisitors(studioId: string): Promise<void> {
    try {
      const visitors = await apiFetch<Array<{ id: string; visitorId: string; visitedAt: string }>>(`/api/studio/${studioId}/visitors`);
      useStudioStore.getState().setRecentVisitors(
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
