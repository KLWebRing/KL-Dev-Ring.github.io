// ── KL DevVerse — Builder Twin Chat Panel ────────────────────────────
// Interactive chat interface for talking to a builder's AI twin.

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Message {
  role: 'visitor' | 'twin';
  content: string;
  timestamp: string;
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly targetUserId?: string; // The builder whose twin we're talking to
}

export const BuilderTwin: React.FC<Props> = ({ isOpen, onClose, targetUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [twinGreeting, setTwinGreeting] = useState("Hey! I'm the AI twin. Ask me anything!");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('kldevverse_access_token');
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }, []);

  // Load greeting
  useEffect(() => {
    if (!isOpen || !targetUserId) return;
    setMessages([{
      role: 'twin',
      content: twinGreeting,
      timestamp: new Date().toISOString(),
    }]);
  }, [isOpen, targetUserId, twinGreeting]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !targetUserId || loading) return;

    const question = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'visitor', content: question, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await fetch(`/api/ecosystem/twin/${targetUserId}/ask`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ question }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'twin', content: data.answer, timestamp: data.timestamp }]);
      } else {
        setMessages(prev => [...prev, { role: 'twin', content: "Sorry, I couldn't process that. Try again?", timestamp: new Date().toISOString() }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'twin', content: "Connection issue. Please try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  }, [input, targetUserId, loading, getHeaders]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 5, 15, 0.92)', backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'rgba(18, 18, 32, 0.98)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', width: '500px', height: '600px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), transparent)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px',
            }}>🤖</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>AI Builder Twin</div>
              <div style={{ fontSize: '11px', color: '#34d399' }}>● Online</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#9ca3af', width: '28px', height: '28px', borderRadius: '6px',
            cursor: 'pointer', fontSize: '12px',
          }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'visitor' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', borderRadius: '12px',
                background: msg.role === 'visitor'
                  ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                  : 'rgba(255,255,255,0.05)',
                border: msg.role === 'twin' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                color: '#e5e7eb', fontSize: '13px', lineHeight: 1.5,
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                padding: '10px 14px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)',
                color: '#6b7280', fontSize: '13px',
              }}>
                Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', gap: '8px',
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask the twin something..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#e5e7eb', fontSize: '13px', outline: 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: '10px 18px', borderRadius: '10px',
              background: loading ? '#374151' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
              border: 'none', color: '#fff', cursor: loading ? 'default' : 'pointer',
              fontSize: '13px', fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
