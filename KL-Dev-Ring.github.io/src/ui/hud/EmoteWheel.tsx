// ── KL DevVerse — Emote Wheel ────────────────────────────────────────
// Radial emote selector triggered by a hotkey (default: T).
// Sends emote via networkSystem.

import React, { useState, useEffect, useCallback } from 'react';
import { EMOTE } from '@/shared/constants';
import { networkSystem } from '@/network/NetworkSystem';
import { useAuthStore } from '@/auth/authStore';

export const EmoteWheel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const toggle = useCallback((e: KeyboardEvent) => {
    if (e.key === 't' || e.key === 'T') {
      // Don't trigger when typing in input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      setIsOpen((prev) => !prev);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
    // Number keys trigger emotes directly
    const emote = EMOTE.LIST.find((em) => em.key === e.key);
    if (emote && isOpen) {
      networkSystem.sendEmote(emote.type);
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', toggle);
    return () => window.removeEventListener('keydown', toggle);
  }, [toggle]);

  if (!isAuthenticated || !isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 95,
    }}>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
        }}
        onClick={() => setIsOpen(false)}
      />

      {/* Wheel */}
      <div style={{
        position: 'relative',
        width: 280,
        height: 280,
        borderRadius: '50%',
        background: 'rgba(8, 11, 14, 0.92)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Center label */}
        <div style={{
          position: 'absolute',
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'var(--muted)',
          letterSpacing: '0.1em',
          textAlign: 'center',
        }}>
          EMOTES
          <br />
          <span style={{ fontSize: 8, opacity: 0.5 }}>press number key</span>
        </div>

        {/* Emote buttons arranged in a circle */}
        {EMOTE.LIST.map((emote, i) => {
          const angle = (i / EMOTE.LIST.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 100;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <button
              key={emote.type}
              onClick={() => {
                networkSystem.sendEmote(emote.type);
                setIsOpen(false);
              }}
              style={{
                position: 'absolute',
                left: `calc(50% + ${x}px - 28px)`,
                top: `calc(50% + ${y}px - 28px)`,
                width: 56,
                height: 56,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--text)',
                fontSize: 20,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                transition: 'transform 0.15s, background 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.15)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }}
            >
              <span>{emote.label.split(' ')[0]}</span>
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 7,
                color: 'var(--muted)',
                letterSpacing: '0.05em',
              }}>
                [{emote.key}]
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
