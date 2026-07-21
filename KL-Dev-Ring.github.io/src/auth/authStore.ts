// ── KL DevVerse — Auth Store ─────────────────────────────────────────
// Client-side authentication state.
// Manages JWT tokens, user profile, login/logout flows.

import { create } from 'zustand';
import type { AuthUser } from '@/shared/types';

const TOKEN_KEY = 'kl_access_token';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  error: string | null;

  // Actions
  setAuth: (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Lifecycle
  initialize: () => Promise<void>;
  handleOAuthCallback: () => boolean;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: null,
  error: null,

  setAuth: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ isAuthenticated: true, user, accessToken: token, error: null, isLoading: false });
  },

  clearAuth: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ isAuthenticated: false, user: null, accessToken: null, error: null, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),

  /**
   * Initialize auth on app startup.
   * Checks for stored token and validates it.
   */
  initialize: async () => {
    set({ isLoading: true });

    // Check if we're returning from an OAuth callback
    if (get().handleOAuthCallback()) return;

    // Try to use stored token
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (res.ok) {
        const user = (await res.json()) as AuthUser;
        set({ isAuthenticated: true, user, accessToken: storedToken, isLoading: false });
      } else {
        // Token expired — try refresh
        const refreshed = await get().refreshToken();
        if (!refreshed) {
          get().clearAuth();
        }
      }
    } catch {
      // Server unreachable — keep token for later
      set({ isLoading: false });
    }
  },

  /**
   * Check if current URL contains an OAuth callback token.
   * Called during initialize().
   */
  handleOAuthCallback: () => {
    const hash = window.location.hash;
    if (!hash.includes('token=')) return false;

    const token = hash.split('token=')[1]?.split('&')[0];
    if (!token) return false;

    // Clean URL
    window.history.replaceState(null, '', window.location.pathname);

    // Validate token by fetching /auth/me
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Invalid token');
      })
      .then((user: AuthUser) => {
        get().setAuth(user, token);
      })
      .catch(() => {
        get().setError('Login failed — please try again');
      });

    return true;
  },

  /**
   * Logout — clear local state and invalidate server session.
   */
  logout: async () => {
    const token = get().accessToken;

    get().clearAuth();

    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
      } catch {
        // Server unreachable — local logout still happened
      }
    }
  },

  /**
   * Refresh the access token using the httpOnly refresh cookie.
   */
  refreshToken: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = (await res.json()) as { accessToken: string; user: AuthUser };
        get().setAuth(data.user, data.accessToken);
        return true;
      }
    } catch {
      // Refresh failed
    }

    return false;
  },
}));
