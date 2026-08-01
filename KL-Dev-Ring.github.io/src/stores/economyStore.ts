// ── KL DevVerse — Economy Store ──────────────────────────────────────
// Zustand store for wallet state and economy operations.
// Fetches from backend API, caches in memory.

import { create } from 'zustand';
import type {
  Wallet,
  WalletTransaction,
  DailyRewardResult,
  TransactionPage,
} from '@/economy/economyTypes';

// ── API Base ────────────────────────────────────────────────────────

const API_BASE = '/api/economy/wallet';

// ── Store State ─────────────────────────────────────────────────────

interface EconomyState {
  // Wallet
  wallet: Wallet | null;
  walletLoading: boolean;
  walletError: string | null;

  // Transactions
  transactions: WalletTransaction[];
  transactionPage: number;
  transactionTotalPages: number;
  transactionsLoading: boolean;

  // Daily reward
  dailyRewardResult: DailyRewardResult | null;
  dailyClaimLoading: boolean;

  // Balance change animation queue
  pendingAnimations: Array<{ currency: string; amount: number; id: string }>;

  // Actions
  fetchWallet: () => Promise<void>;
  claimDailyReward: () => Promise<DailyRewardResult | null>;
  fetchTransactions: (page?: number) => Promise<void>;
  queueAnimation: (currency: string, amount: number) => void;
  dequeueAnimation: (id: string) => void;
  clearError: () => void;
}

// ── Helper: API fetch with auth ─────────────────────────────────────

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('kldevverse_access_token');
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ── Store ───────────────────────────────────────────────────────────

export const useEconomyStore = create<EconomyState>((set, get) => ({
  // Initial state
  wallet: null,
  walletLoading: false,
  walletError: null,
  transactions: [],
  transactionPage: 1,
  transactionTotalPages: 1,
  transactionsLoading: false,
  dailyRewardResult: null,
  dailyClaimLoading: false,
  pendingAnimations: [],

  // ── Fetch Wallet ────────────────────────────────────────────────

  fetchWallet: async () => {
    set({ walletLoading: true, walletError: null });
    try {
      const wallet = await apiFetch<Wallet>(API_BASE);
      set({ wallet, walletLoading: false });
    } catch (err) {
      set({
        walletError: err instanceof Error ? err.message : 'Failed to load wallet',
        walletLoading: false,
      });
    }
  },

  // ── Claim Daily Reward ──────────────────────────────────────────

  claimDailyReward: async () => {
    set({ dailyClaimLoading: true });
    try {
      const result = await apiFetch<DailyRewardResult>(`${API_BASE}/claim-daily`, {
        method: 'POST',
      });
      set({ dailyRewardResult: result, dailyClaimLoading: false });

      // Queue animation
      get().queueAnimation(result.reward.currency, result.reward.amount);

      // Refresh wallet
      await get().fetchWallet();

      return result;
    } catch (err) {
      set({ dailyClaimLoading: false });
      console.error('[EconomyStore] Daily claim failed:', err);
      return null;
    }
  },

  // ── Fetch Transactions ──────────────────────────────────────────

  fetchTransactions: async (page = 1) => {
    set({ transactionsLoading: true });
    try {
      const data = await apiFetch<TransactionPage>(
        `${API_BASE}/transactions?page=${page}&limit=50`,
      );
      set({
        transactions: data.transactions as WalletTransaction[],
        transactionPage: data.pagination.page,
        transactionTotalPages: data.pagination.totalPages,
        transactionsLoading: false,
      });
    } catch {
      set({ transactionsLoading: false });
    }
  },

  // ── Animation Queue ─────────────────────────────────────────────

  queueAnimation: (currency, amount) => {
    const id = `anim_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    set(state => ({
      pendingAnimations: [...state.pendingAnimations, { currency, amount, id }],
    }));

    // Auto-dequeue after animation duration
    setTimeout(() => get().dequeueAnimation(id), 3000);
  },

  dequeueAnimation: (id) => {
    set(state => ({
      pendingAnimations: state.pendingAnimations.filter(a => a.id !== id),
    }));
  },

  clearError: () => set({ walletError: null }),
}));
