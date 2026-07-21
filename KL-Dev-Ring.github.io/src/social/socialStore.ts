// ── KL DevVerse — Social Store ───────────────────────────────────────
// Client-side state for friends, nearby players, recently met.

import { create } from 'zustand';
import type { FriendEntry, FriendRequest as FriendRequestType, NearbyPlayer, RecentlyMetPlayer } from '@/shared/types';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

interface SocialState {
  // Friends
  friends: FriendEntry[];
  pendingRequests: FriendRequestType[];
  isLoadingFriends: boolean;

  // Nearby & recently met
  nearbyPlayers: NearbyPlayer[];
  recentlyMet: RecentlyMetPlayer[];

  // Actions
  fetchFriends: (token: string) => Promise<void>;
  fetchPendingRequests: (token: string) => Promise<void>;
  sendFriendRequest: (token: string, targetUserId: string) => Promise<void>;
  acceptFriendRequest: (token: string, requestId: string) => Promise<void>;
  rejectFriendRequest: (token: string, requestId: string) => Promise<void>;
  removeFriend: (token: string, userId: string) => Promise<void>;

  // Nearby management (computed from networkStore in the game loop)
  setNearbyPlayers: (players: NearbyPlayer[]) => void;
  addRecentlyMet: (player: RecentlyMetPlayer) => void;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  friends: [],
  pendingRequests: [],
  isLoadingFriends: false,
  nearbyPlayers: [],
  recentlyMet: [],

  fetchFriends: async (token) => {
    set({ isLoadingFriends: true });
    try {
      const res = await fetch(`${API_BASE}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as FriendEntry[];
        set({ friends: data, isLoadingFriends: false });
      }
    } catch {
      set({ isLoadingFriends: false });
    }
  },

  fetchPendingRequests: async (token) => {
    try {
      const res = await fetch(`${API_BASE}/friends/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as FriendRequestType[];
        set({ pendingRequests: data });
      }
    } catch {
      // silent
    }
  },

  sendFriendRequest: async (token, targetUserId) => {
    try {
      await fetch(`${API_BASE}/friends/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetUserId }),
      });
    } catch {
      // silent
    }
  },

  acceptFriendRequest: async (token, requestId) => {
    try {
      await fetch(`${API_BASE}/friends/accept/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      // Re-fetch
      await get().fetchFriends(token);
      await get().fetchPendingRequests(token);
    } catch {
      // silent
    }
  },

  rejectFriendRequest: async (token, requestId) => {
    try {
      await fetch(`${API_BASE}/friends/reject/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      await get().fetchPendingRequests(token);
    } catch {
      // silent
    }
  },

  removeFriend: async (token, userId) => {
    try {
      await fetch(`${API_BASE}/friends/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await get().fetchFriends(token);
    } catch {
      // silent
    }
  },

  setNearbyPlayers: (players) => set({ nearbyPlayers: players }),

  addRecentlyMet: (player) => {
    set((state) => {
      const exists = state.recentlyMet.some((p) => p.userId === player.userId);
      if (exists) return state;
      return {
        recentlyMet: [player, ...state.recentlyMet].slice(0, 20),
      };
    });
  },
}));
