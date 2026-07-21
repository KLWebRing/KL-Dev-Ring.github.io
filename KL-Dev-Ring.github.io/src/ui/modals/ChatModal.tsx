// ── KL DevVerse — Chat / Notice Board Modal ───────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '@/stores/uiStore';

interface ChatMessage {
  id: string;
  handle: string;
  text: string;
  time: string;
}

const STORAGE_KEY = 'kl-town-notices';
const BOT_REPLIES = [
  'Great to see you here! Keep building.',
  'Welcome to Kerala\'s builder town! 🌴',
  'The code is strong with this one.',
  'Ship it! Production is calling.',
  '🌺 Namaste, developer!',
  'Debug mode: engaged. Coffee level: critical.',
];

function loadMessages(): ChatMessage[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ChatMessage[];
  } catch {
    return [];
  }
}

function saveMessages(msgs: ChatMessage[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-100)));
}

export const ChatModal: React.FC = () => {
  const { closeModal } = useUIStore();
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      handle: 'visitor',
      text,
      time,
    };

    const botMsg: ChatMessage = {
      id: crypto.randomUUID(),
      handle: 'KLBot',
      text: BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)] ?? 'Hello!',
      time,
    };

    const next = [...messages, userMsg, botMsg];
    setMessages(next);
    saveMessages(next);
    setInput('');
  };

  return (
    <div className="modal-panel" style={{ maxWidth: 560, height: '70vh' }}>
      <div className="modal-header">
        <span><span className="live-dot" />COMMUNITY CORRIDOR / NOTICE BOARD</span>
        <button className="modal-close" onClick={closeModal} aria-label="Close">×</button>
      </div>

      <div className="modal-body" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', padding: 24 }}>
            Be the first to pin a notice. 🌴
          </p>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: msg.handle === 'KLBot' ? 'var(--accent)' : 'var(--blue)',
                fontWeight: 600,
              }}>
                {msg.handle}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>{msg.time}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={submit}
        style={{
          display: 'flex', gap: 8, padding: '10px 16px',
          borderTop: '1px solid var(--border)', flexShrink: 0,
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Pin a notice to the board..."
          maxLength={500}
          autoComplete="off"
          style={{
            flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
            color: 'var(--text)', padding: '6px 10px', borderRadius: 4,
            fontFamily: 'var(--mono)', fontSize: 11, outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            background: 'var(--accent)', color: '#000', border: 'none',
            padding: '6px 14px', borderRadius: 4, fontFamily: 'var(--mono)',
            fontSize: 10, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em',
          }}
        >
          PIN ↗
        </button>
      </form>
    </div>
  );
};
