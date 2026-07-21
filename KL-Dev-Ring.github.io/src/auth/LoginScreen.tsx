// ── KL DevVerse — Login Screen ───────────────────────────────────────
// Shown when the user is not authenticated.
// Provides "Login with GitHub" button and guest mode option.

import React from 'react';
import { useAuthStore } from './authStore';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export const LoginScreen: React.FC = () => {
  const { isLoading, error } = useAuthStore();

  const handleGitHubLogin = () => {
    window.location.href = `${API_BASE}/auth/github`;
  };

  if (isLoading) return null; // Boot screen handles loading visuals

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      zIndex: 90,
    }}>
      {error && (
        <div style={{
          background: '#1f0a0a',
          border: '1px solid #7f1d1d',
          color: '#fca5a5',
          padding: '6px 14px',
          borderRadius: 6,
          fontFamily: 'var(--mono)',
          fontSize: 11,
        }}>
          {error}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}>
        <button
          onClick={handleGitHubLogin}
          style={{
            background: 'linear-gradient(135deg, #24292e, #1a1e22)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '10px 24px',
            borderRadius: 8,
            fontFamily: 'var(--mono)',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: '0.04em',
            transition: 'transform 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.03)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          LOGIN WITH GITHUB
        </button>

        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--muted)',
          opacity: 0.5,
        }}>
          or explore as guest
        </span>
      </div>
    </div>
  );
};
