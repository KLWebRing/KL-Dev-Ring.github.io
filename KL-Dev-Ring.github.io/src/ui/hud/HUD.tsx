// ── KL DevVerse — HUD Component ───────────────────────────────────────
// Renders the interaction prompt, controls hint, topbar stats, and
// Phase 2 social buttons (Friends, Emote hint, online count).
// Reads from stores — no game loop dependency.

import React from 'react';
import { useGameStore } from '@/stores/gameStore';
import { useWorldStore } from '@/stores/worldStore';
import { useNetworkStore } from '@/stores/networkStore';
import { useAuthStore } from '@/auth/authStore';
import { useUIStore } from '@/stores/uiStore';

export const HUD: React.FC = () => {
  const nearestInteractable = useGameStore(s => s.nearestInteractable);
  const networkData = useWorldStore(s => s.networkData);
  const onlineCount = useNetworkStore(s => s.onlineCount);
  const connectionState = useNetworkStore(s => s.connectionState);
  const { isAuthenticated, user, logout } = useAuthStore();
  const { openModal } = useUIStore();

  const stats = networkData?.stats;

  return (
    <>
      {/* Topbar */}
      <header className="topbar">
        <a className="brand" href="./" aria-label="KL DevVerse home">
          <svg viewBox="0 0 46 46" aria-hidden="true">
            <path d="M23 2 42 12v22L23 44 4 34V12Z"/>
            <path d="m12 27 7-11v14m0-7 9-7m-9 7 9 7m-1-14h7m-7 14h7"/>
          </svg>
          <span><b>KL</b> DEVVERSE</span>
        </a>

        <div className="topbar-stats">
          {stats ? (
            <>
              <span><b>{String(stats.builders).padStart(2,'0')}</b> BUILDERS</span>
              <span><b>{String(stats.districts).padStart(2,'0')}</b> DISTRICTS</span>
              <span><b>{String(stats.projects).padStart(2,'0')}</b> PROJECTS</span>
            </>
          ) : (
            <span>LOADING...</span>
          )}

          {/* Online count (Phase 2) */}
          {connectionState === 'connected' && (
            <span style={{ color: '#22c55e' }}>
              <b>{String(onlineCount).padStart(2, '0')}</b> ONLINE
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {/* Friends button (Phase 2) */}
          {isAuthenticated && (
            <button
              onClick={() => openModal('friends')}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                padding: '5px 10px',
                color: 'var(--muted)',
                fontFamily: 'var(--mono)',
                fontSize: 10,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              👥 FRIENDS
            </button>
          )}

          {/* User badge / Auth button */}
          {isAuthenticated && user ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '3px 8px 3px 4px',
            }}>
              <img
                src={user.avatarUrl}
                alt=""
                width={20}
                height={20}
                style={{ borderRadius: 4 }}
              />
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: 'var(--text)',
                fontWeight: 600,
              }}>
                {user.username}
              </span>
              <button
                onClick={() => void logout()}
                title="Logout"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '0 2px',
                  opacity: 0.5,
                }}
              >
                ⏏
              </button>
            </div>
          ) : (
            <a
              className="join-button"
              href="https://github.com/KLWebRing/KL-Dev-Ring.github.io#join"
              target="_blank"
              rel="noreferrer"
            >
              <span>Join the ring</span><i>↗</i>
            </a>
          )}
        </div>
      </header>

      {/* Interaction Prompt */}
      <div className={`interaction-prompt${nearestInteractable ? ' visible' : ''}`}>
        {nearestInteractable?.message ?? ''}
      </div>

      {/* Controls hint */}
      <div className="hud-controls">
        <span><b>WASD</b> Walk</span>
        <span><b>SHIFT</b> Run</span>
        <span><b>SPACE</b> Jump</span>
        <span><b>E</b> Interact</span>
        <span><b>DRAG</b> Camera</span>
        {isAuthenticated && <span><b>T</b> Emote</span>}
      </div>
    </>
  );
};
