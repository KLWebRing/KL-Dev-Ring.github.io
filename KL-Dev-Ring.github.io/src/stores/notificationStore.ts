// ── KL DevVerse — Notification Store ─────────────────────────────────
// Queue-based notification system with priorities and auto-dismiss.
// Supports economy notifications: purchase, XP, cash, level up, upgrade.

import { create } from 'zustand';

// ── Notification Types ──────────────────────────────────────────────

export type EconomyNotificationType =
  | 'purchase'
  | 'xp_gain'
  | 'cash_earned'
  | 'cash_spent'
  | 'level_up'
  | 'studio_upgrade'
  | 'daily_reward'
  | 'achievement'
  | 'reputation'
  | 'system'
  ;

export type NotificationPriority = 'low' | 'medium' | 'high';

export interface EconomyNotificationDef {
  readonly id: string;
  readonly type: EconomyNotificationType;
  readonly title: string;
  readonly message: string;
  readonly icon: string;
  readonly color: string;
  readonly priority: NotificationPriority;
  readonly createdAt: number;
  readonly duration: number; // ms before auto-dismiss
}

// ── Store ───────────────────────────────────────────────────────────

interface NotificationState {
  notifications: EconomyNotificationDef[];
  maxVisible: number;

  // Actions
  push: (notification: Omit<EconomyNotificationDef, 'id' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
  clear: () => void;

  // Convenience pushers
  pushPurchase: (itemName: string, price: number) => void;
  pushXpGain: (amount: number, source: string) => void;
  pushCashEarned: (amount: number, source: string) => void;
  pushLevelUp: (newLevel: number) => void;
  pushStudioUpgrade: (tierName: string) => void;
  pushDailyReward: (day: number, amount: number) => void;
  pushAchievement: (name: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  maxVisible: 5,

  push: (notification) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const full: EconomyNotificationDef = {
      ...notification,
      id,
      createdAt: Date.now(),
    };

    set(state => ({
      notifications: [...state.notifications.slice(-9), full], // Keep max 10
    }));

    // Auto-dismiss
    setTimeout(() => get().dismiss(id), notification.duration);
  },

  dismiss: (id) => {
    set(state => ({
      notifications: state.notifications.filter(n => n.id !== id),
    }));
  },

  clear: () => set({ notifications: [] }),

  // ── Convenience ─────────────────────────────────────────────────

  pushPurchase: (itemName, price) => {
    get().push({
      type: 'purchase',
      title: 'Purchase Complete',
      message: `${itemName} — ₿C ${price.toLocaleString()}`,
      icon: '🛒',
      color: '#22c55e',
      priority: 'medium',
      duration: 4000,
    });
  },

  pushXpGain: (amount, source) => {
    get().push({
      type: 'xp_gain',
      title: `+${amount} XP`,
      message: source,
      icon: '⭐',
      color: '#60a5fa',
      priority: 'low',
      duration: 3000,
    });
  },

  pushCashEarned: (amount, source) => {
    get().push({
      type: 'cash_earned',
      title: `+₿C ${amount.toLocaleString()}`,
      message: source,
      icon: '💰',
      color: '#fbbf24',
      priority: 'low',
      duration: 3000,
    });
  },

  pushLevelUp: (newLevel) => {
    get().push({
      type: 'level_up',
      title: 'Level Up!',
      message: `You reached Level ${newLevel}`,
      icon: '🎯',
      color: '#a78bfa',
      priority: 'high',
      duration: 5000,
    });
  },

  pushStudioUpgrade: (tierName) => {
    get().push({
      type: 'studio_upgrade',
      title: 'Studio Upgraded',
      message: `Welcome to your ${tierName}`,
      icon: '🏗️',
      color: '#f59e0b',
      priority: 'high',
      duration: 5000,
    });
  },

  pushDailyReward: (day, amount) => {
    get().push({
      type: 'daily_reward',
      title: `Day ${day} Reward`,
      message: `+₿C ${amount.toLocaleString()}`,
      icon: '🎁',
      color: '#ec4899',
      priority: 'medium',
      duration: 4000,
    });
  },

  pushAchievement: (name) => {
    get().push({
      type: 'achievement',
      title: 'Achievement Unlocked',
      message: name,
      icon: '🏆',
      color: '#d97706',
      priority: 'high',
      duration: 5000,
    });
  },
}));
