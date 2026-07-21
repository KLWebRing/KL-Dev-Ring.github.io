// ── KL DevVerse — Chat Window ────────────────────────────────────────
// Tabbed chat panel: Global, Nearby, District, Private.
// Reads from networkStore for real-time messages.
// Sends via networkSystem.

import React, { useState, useRef, useEffect } from 'react';
import { useNetworkStore } from '@/stores/networkStore';
import { useAuthStore } from '@/auth/authStore';
import { networkSystem } from '@/network/NetworkSystem';

const TABS = [
  { key: 'global', label: '🌍 Global' },
  { key: 'nearby', label: '📍 Nearby' },
  { key: 'district', label: '🏘️ District' },
] as const;

type TabKey = typeof TABS[number]['key'];

export const ChatWindow: React.FC = () => {
  const { chatMessages, activeChannel, setActiveChannel } = useNetworkStore();
  const { isAuthenticated, user } = useAuthStore();
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isOpen]);

  const filteredMessages = chatMessages.filter((m) => {
    if (activeChannel === 'global') return m.channel === 'global' || m.channel === 'system';
    return m.channel === activeChannel;
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !isAuthenticated) return;

    networkSystem.sendChatMessage(activeChannel, text);
    setInput('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '8px 14px',
          color: '#fff',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
          zIndex: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          letterSpacing: '0.04em',
        }}
      >
        💬 CHAT
        {chatMessages.length > 0 && (
          <span style={{
            background: 'var(--accent)',
            color: '#000',
            borderRadius: 10,
            padding: '1px 6px',
            fontSize: 9,
            fontWeight: 700,
          }}>
            {Math.min(chatMessages.length, 99)}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 12,
      right: 12,
      width: 380,
      height: 420,
      background: 'rgba(8, 11, 14, 0.92)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 85,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveChannel(tab.key)}
              style={{
                background: activeChannel === tab.key
                  ? 'rgba(255,255,255,0.1)'
                  : 'transparent',
                border: 'none',
                borderRadius: 4,
                padding: '4px 8px',
                color: activeChannel === tab.key ? '#fff' : 'var(--muted)',
                fontFamily: 'var(--mono)',
                fontSize: 9,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'background 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--muted)',
            fontSize: 16,
            cursor: 'pointer',
            padding: '2px 6px',
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}>
        {filteredMessages.length === 0 && (
          <p style={{
            color: 'var(--muted)',
            fontSize: 11,
            textAlign: 'center',
            padding: 32,
            opacity: 0.5,
          }}>
            No messages yet. Say hello! 🌴
          </p>
        )}
        {filteredMessages.map((msg) => (
          <div key={msg.id} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            opacity: msg.isSystem ? 0.5 : 1,
          }}>
            <div style={{
              display: 'flex',
              gap: 6,
              alignItems: 'baseline',
            }}>
              {msg.authorAvatar && !msg.isSystem && (
                <img
                  src={msg.authorAvatar}
                  alt=""
                  width={14}
                  height={14}
                  style={{ borderRadius: 3, marginTop: 1 }}
                />
              )}
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                color: msg.isSystem ? 'var(--muted)' : (
                  msg.authorId === user?.id ? 'var(--accent)' : '#60a5fa'
                ),
                fontWeight: 600,
              }}>
                {msg.isSystem ? '⚡' : msg.authorName}
              </span>
              <span style={{
                fontFamily: 'var(--mono)',
                fontSize: 8,
                color: 'var(--muted)',
                opacity: 0.5,
              }}>
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <p style={{
              fontSize: 12,
              color: msg.isSystem ? 'var(--muted)' : 'var(--text)',
              lineHeight: 1.5,
              marginLeft: msg.isSystem ? 0 : 20,
              fontStyle: msg.isSystem ? 'italic' : 'normal',
            }}>
              {msg.content}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isAuthenticated ? (
        <form
          onSubmit={submit}
          style={{
            display: 'flex',
            gap: 6,
            padding: '8px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${activeChannel}...`}
            maxLength={1000}
            autoComplete="off"
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text)',
              padding: '6px 10px',
              borderRadius: 4,
              fontFamily: 'var(--mono)',
              fontSize: 11,
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--accent)',
              color: '#000',
              border: 'none',
              padding: '6px 12px',
              borderRadius: 4,
              fontFamily: 'var(--mono)',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            SEND
          </button>
        </form>
      ) : (
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          fontFamily: 'var(--mono)',
          fontSize: 10,
          color: 'var(--muted)',
          textAlign: 'center',
        }}>
          Login to chat
        </div>
      )}
    </div>
  );
};
