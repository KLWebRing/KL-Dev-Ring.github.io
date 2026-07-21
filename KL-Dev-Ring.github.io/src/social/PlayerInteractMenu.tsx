// ── KL DevVerse — Player Interaction Menu ────────────────────────────
// "Press E" menu when approaching another player.
// Options: View Profile, Add Friend, Message, Wave.

import React from 'react';
import { useAuthStore } from '@/auth/authStore';
import { useSocialStore } from './socialStore';
import { networkSystem } from '@/network/NetworkSystem';
import { useNetworkStore } from '@/stores/networkStore';

interface PlayerInteractMenuProps {
  readonly targetSessionId: string;
  readonly targetUsername: string;
  readonly targetUserId: string;
  readonly targetAvatarUrl: string;
  readonly onClose: () => void;
  readonly onViewProfile: () => void;
}

export const PlayerInteractMenu: React.FC<PlayerInteractMenuProps> = ({
  targetSessionId,
  targetUsername,
  targetUserId,
  targetAvatarUrl,
  onClose,
  onViewProfile,
}) => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { sendFriendRequest, friends } = useSocialStore();
  const { setActiveChannel, setPrivateChatTarget } = useNetworkStore();

  const isFriend = friends.some((f) => f.userId === targetUserId);

  const actions = [
    {
      icon: '🪪',
      label: 'View Profile',
      enabled: true,
      action: () => {
        onViewProfile();
        onClose();
      },
    },
    {
      icon: '🤝',
      label: isFriend ? 'Already Friends' : 'Add Friend',
      enabled: isAuthenticated && !isFriend,
      action: () => {
        if (accessToken) {
          void sendFriendRequest(accessToken, targetUserId);
        }
        onClose();
      },
    },
    {
      icon: '💬',
      label: 'Message',
      enabled: isAuthenticated,
      action: () => {
        setActiveChannel('private');
        setPrivateChatTarget({ userId: targetUserId, username: targetUsername });
        onClose();
      },
    },
    {
      icon: '👋',
      label: 'Wave',
      enabled: true,
      action: () => {
        networkSystem.sendEmote('wave');
        onClose();
      },
    },
  ];

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(8, 11, 14, 0.95)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      padding: '16px 20px',
      minWidth: 240,
      zIndex: 100,
    }}>
      {/* Player header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        paddingBottom: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <img
          src={targetAvatarUrl || `https://github.com/${targetUsername}.png?size=40`}
          alt=""
          width={36}
          height={36}
          style={{ borderRadius: 8 }}
        />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {targetUsername}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: '#22c55e' }}>
            ONLINE
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={action.enabled ? action.action : undefined}
            disabled={!action.enabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderRadius: 6,
              padding: '8px 10px',
              color: action.enabled ? 'var(--text)' : 'var(--muted)',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              fontWeight: 600,
              cursor: action.enabled ? 'pointer' : 'default',
              opacity: action.enabled ? 1 : 0.4,
              textAlign: 'left',
              transition: 'background 0.15s',
              letterSpacing: '0.03em',
            }}
            onMouseEnter={(e) => {
              if (action.enabled) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span style={{ fontSize: 14 }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Close hint */}
      <div style={{
        marginTop: 8,
        paddingTop: 8,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontFamily: 'var(--mono)',
        fontSize: 9,
        color: 'var(--muted)',
        textAlign: 'center',
        opacity: 0.5,
      }}>
        Press ESC to close
      </div>
    </div>
  );
};
