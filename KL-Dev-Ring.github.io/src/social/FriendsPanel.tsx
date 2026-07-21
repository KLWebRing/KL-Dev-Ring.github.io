// ── KL DevVerse — Friends Panel ──────────────────────────────────────
// Shows friends list with online status, pending requests, and search.

import React, { useEffect } from 'react';
import { useSocialStore } from './socialStore';
import { useAuthStore } from '@/auth/authStore';
import { useUIStore } from '@/stores/uiStore';

export const FriendsPanel: React.FC = () => {
  const { closeModal } = useUIStore();
  const { accessToken } = useAuthStore();
  const {
    friends,
    pendingRequests,
    isLoadingFriends,
    fetchFriends,
    fetchPendingRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
  } = useSocialStore();

  useEffect(() => {
    if (accessToken) {
      void fetchFriends(accessToken);
      void fetchPendingRequests(accessToken);
    }
  }, [accessToken, fetchFriends, fetchPendingRequests]);

  const onlineFriends = friends.filter((f) => f.status === 'online');
  const offlineFriends = friends.filter((f) => f.status !== 'online');

  return (
    <div className="modal-panel" style={{ maxWidth: 480, height: '70vh' }}>
      <div className="modal-header">
        <span>
          <span className="live-dot" />
          FRIENDS · {friends.length}
        </span>
        <button className="modal-close" onClick={closeModal} aria-label="Close">×</button>
      </div>

      <div className="modal-body" style={{
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflowY: 'auto',
      }}>
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div>
            <p style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              color: 'var(--accent)',
              letterSpacing: '0.1em',
              marginBottom: 6,
            }}>
              PENDING REQUESTS · {pendingRequests.length}
            </p>
            {pendingRequests.map((req) => (
              <div key={req.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                background: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.2)',
                borderRadius: 6,
                marginBottom: 4,
              }}>
                <img
                  src={req.senderAvatar}
                  alt=""
                  width={28}
                  height={28}
                  style={{ borderRadius: 6 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                    {req.senderName}
                  </div>
                </div>
                <button
                  onClick={() => accessToken && void acceptFriendRequest(accessToken, req.id)}
                  style={{
                    background: '#22c55e',
                    color: '#000',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ACCEPT
                </button>
                <button
                  onClick={() => accessToken && void rejectFriendRequest(accessToken, req.id)}
                  style={{
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 4,
                    padding: '4px 10px',
                    fontFamily: 'var(--mono)',
                    fontSize: 9,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  IGNORE
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Online Friends */}
        {onlineFriends.length > 0 && (
          <div>
            <p style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              color: '#22c55e',
              letterSpacing: '0.1em',
              marginBottom: 6,
            }}>
              ONLINE · {onlineFriends.length}
            </p>
            {onlineFriends.map((f) => (
              <FriendRow
                key={f.friendshipId}
                friend={f}
                onRemove={() => accessToken && void removeFriend(accessToken, f.userId)}
              />
            ))}
          </div>
        )}

        {/* Offline Friends */}
        {offlineFriends.length > 0 && (
          <div>
            <p style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              color: 'var(--muted)',
              letterSpacing: '0.1em',
              marginBottom: 6,
              opacity: 0.6,
            }}>
              OFFLINE · {offlineFriends.length}
            </p>
            {offlineFriends.map((f) => (
              <FriendRow
                key={f.friendshipId}
                friend={f}
                onRemove={() => accessToken && void removeFriend(accessToken, f.userId)}
              />
            ))}
          </div>
        )}

        {isLoadingFriends && (
          <p style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', padding: 24 }}>
            Loading friends...
          </p>
        )}

        {!isLoadingFriends && friends.length === 0 && pendingRequests.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 11, textAlign: 'center', padding: 24 }}>
            No friends yet. Walk up to another player and press E → Add Friend 🤝
          </p>
        )}
      </div>
    </div>
  );
};

// ── Friend Row ───────────────────────────────────────────────────────

const FriendRow: React.FC<{
  friend: { username: string; displayName: string; avatarUrl: string; status: string };
  onRemove: () => void;
}> = ({ friend, onRemove }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    borderRadius: 6,
    transition: 'background 0.15s',
  }}
  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    <div style={{ position: 'relative' }}>
      <img
        src={friend.avatarUrl}
        alt=""
        width={32}
        height={32}
        style={{
          borderRadius: 6,
          opacity: friend.status === 'online' ? 1 : 0.5,
        }}
      />
      {friend.status === 'online' && (
        <div style={{
          position: 'absolute',
          bottom: -1,
          right: -1,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#22c55e',
          border: '2px solid var(--surface)',
        }} />
      )}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: friend.status === 'online' ? 'var(--text)' : 'var(--muted)',
      }}>
        {friend.displayName}
      </div>
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        color: 'var(--muted)',
        opacity: 0.6,
      }}>
        @{friend.username}
      </div>
    </div>
    <button
      onClick={onRemove}
      title="Remove friend"
      style={{
        background: 'none',
        border: 'none',
        color: 'var(--muted)',
        fontSize: 14,
        cursor: 'pointer',
        opacity: 0.3,
        transition: 'opacity 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.3')}
    >
      ×
    </button>
  </div>
);
