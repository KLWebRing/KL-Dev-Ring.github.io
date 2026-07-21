// ── KL DevVerse — Network Store ──────────────────────────────────────
// Zustand store for multiplayer state: remote players, chat, connection.
// Bridges the NetworkSystem singleton with React components.

import { create } from 'zustand';
import type {
  RemotePlayer,
  RemotePlayerSnapshot,
  ConnectionState,
  ChatMessage,
  GameNotification,
} from '@/shared/types';
import type { EmoteType } from '@shared/protocol';
import { InterpolationBuffer } from '@/network/Interpolation';
import { NETWORK } from '@shared/constants';

// ── Interpolation buffers (not in Zustand — mutable imperative data) ─
const interpolationBuffers = new Map<string, InterpolationBuffer>();

export function getInterpolationBuffer(sessionId: string): InterpolationBuffer {
  let buf = interpolationBuffers.get(sessionId);
  if (!buf) {
    buf = new InterpolationBuffer();
    interpolationBuffers.set(sessionId, buf);
  }
  return buf;
}

export function removeInterpolationBuffer(sessionId: string): void {
  interpolationBuffers.delete(sessionId);
}

// ── Store ────────────────────────────────────────────────────────────

interface NetworkState {
  // Connection
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;
  localSessionId: string | null;
  setLocalSessionId: (id: string | null) => void;

  // Remote players
  remotePlayers: Map<string, RemotePlayer>;
  addRemotePlayer: (player: RemotePlayer) => void;
  removeRemotePlayer: (sessionId: string) => void;
  updateRemotePlayer: (sessionId: string, snapshot: RemotePlayerSnapshot) => void;
  setRemoteEmote: (sessionId: string, emoteType: EmoteType) => void;
  clearRemoteEmote: (sessionId: string) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  activeChannel: 'global' | 'nearby' | 'district' | 'private';
  setActiveChannel: (ch: 'global' | 'nearby' | 'district' | 'private') => void;
  privateChatTarget: { userId: string; username: string } | null;
  setPrivateChatTarget: (target: { userId: string; username: string } | null) => void;

  // Notifications
  notifications: GameNotification[];
  addNotification: (notification: GameNotification) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;

  // Online count
  onlineCount: number;
  setOnlineCount: (count: number) => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  // Connection
  connectionState: 'disconnected',
  setConnectionState: (connectionState) => set({ connectionState }),
  localSessionId: null,
  setLocalSessionId: (localSessionId) => set({ localSessionId }),

  // Remote players
  remotePlayers: new Map(),

  addRemotePlayer: (player) => {
    const next = new Map(get().remotePlayers);
    next.set(player.sessionId, player);
    set({ remotePlayers: next, onlineCount: next.size + 1 });
  },

  removeRemotePlayer: (sessionId) => {
    const next = new Map(get().remotePlayers);
    next.delete(sessionId);
    removeInterpolationBuffer(sessionId);
    set({ remotePlayers: next, onlineCount: next.size + 1 });
  },

  updateRemotePlayer: (sessionId, snapshot) => {
    // Push to interpolation buffer (outside Zustand for performance)
    getInterpolationBuffer(sessionId).push(snapshot);

    // Interpolate and update the store
    const renderTime = Date.now() - NETWORK.INTERPOLATION_DELAY_MS;
    const interpolated = getInterpolationBuffer(sessionId).interpolate(renderTime);

    if (interpolated) {
      const next = new Map(get().remotePlayers);
      const existing = next.get(sessionId);
      if (existing) {
        next.set(sessionId, {
          ...existing,
          x: interpolated.x,
          y: interpolated.y,
          z: interpolated.z,
          yaw: interpolated.yaw,
          animState: interpolated.animState as RemotePlayer['animState'],
        });
        set({ remotePlayers: next });
      }
    }
  },

  setRemoteEmote: (sessionId, emoteType) => {
    const next = new Map(get().remotePlayers);
    const existing = next.get(sessionId);
    if (existing) {
      next.set(sessionId, {
        ...existing,
        activeEmote: emoteType,
        emoteStartTime: Date.now(),
      });
      set({ remotePlayers: next });
    }
  },

  clearRemoteEmote: (sessionId) => {
    const next = new Map(get().remotePlayers);
    const existing = next.get(sessionId);
    if (existing) {
      next.set(sessionId, {
        ...existing,
        activeEmote: null,
        emoteStartTime: 0,
      });
      set({ remotePlayers: next });
    }
  },

  // Chat
  chatMessages: [],
  addChatMessage: (msg) => {
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-199), msg], // Keep last 200
    }));
  },
  activeChannel: 'global',
  setActiveChannel: (activeChannel) => set({ activeChannel }),
  privateChatTarget: null,
  setPrivateChatTarget: (privateChatTarget) => set({ privateChatTarget }),

  // Notifications
  notifications: [],
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications].slice(0, 50),
    }));
  },
  markNotificationRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      ),
    }));
  },
  clearNotifications: () => set({ notifications: [] }),

  // Online count
  onlineCount: 1, // At least yourself
  setOnlineCount: (onlineCount) => set({ onlineCount }),
}));
