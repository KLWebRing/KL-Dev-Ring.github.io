// ── KL DevVerse — Connection Status Widget ───────────────────────────
// Shows network connection state and online player count in the HUD.

import React from 'react';
import { useNetworkStore } from '@/stores/networkStore';
import { useAuthStore } from '@/auth/authStore';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  connected: { color: '#22c55e', label: 'ONLINE' },
  connecting: { color: '#f59e0b', label: 'CONNECTING...' },
  reconnecting: { color: '#f59e0b', label: 'RECONNECTING...' },
  disconnected: { color: '#6b7280', label: 'OFFLINE' },
  error: { color: '#ef4444', label: 'ERROR' },
};

export const ConnectionStatus: React.FC = () => {
  const connectionState = useNetworkStore((s) => s.connectionState);
  const onlineCount = useNetworkStore((s) => s.onlineCount);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return null;

  const status = STATUS_CONFIG[connectionState] ?? STATUS_CONFIG['disconnected']!;

  return (
    <div style={{
      position: 'fixed',
      bottom: 12,
      left: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: 6,
      padding: '5px 12px',
      zIndex: 80,
      fontFamily: 'var(--mono)',
      fontSize: 10,
      color: 'var(--muted)',
      letterSpacing: '0.06em',
      pointerEvents: 'none',
    }}>
      {/* Status dot */}
      <div style={{
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: status.color,
        boxShadow: `0 0 6px ${status.color}`,
        animation: connectionState === 'connecting' || connectionState === 'reconnecting'
          ? 'pulse 1.5s ease-in-out infinite'
          : undefined,
      }} />

      <span style={{ color: status.color }}>{status.label}</span>

      {connectionState === 'connected' && (
        <span style={{ color: 'var(--muted)', opacity: 0.6 }}>
          · {onlineCount} {onlineCount === 1 ? 'player' : 'players'}
        </span>
      )}
    </div>
  );
};
