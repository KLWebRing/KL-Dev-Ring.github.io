// ── KL DevVerse — Reputation Panel ───────────────────────────────────
// Full-screen modal showing reputation score, source breakdown, and history.

import React, { useState, useEffect, useCallback } from 'react';

interface RepSummary {
  totalReputation: number;
  breakdown: Array<{ source: string; total: number; count: number }>;
}

interface RepEntry {
  id: string;
  amount: number;
  source: string;
  description: string;
  givenBy: string | null;
  createdAt: string;
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const SOURCE_META: Record<string, { icon: string; label: string; color: string }> = {
  HELPING: { icon: '🤝', label: 'Helping Others', color: '#34d399' },
  COMMUNITY: { icon: '🏘️', label: 'Community', color: '#60a5fa' },
  PROJECT: { icon: '🚀', label: 'Projects', color: '#a78bfa' },
  MENTORING: { icon: '🎓', label: 'Mentoring', color: '#fbbf24' },
  EVENT: { icon: '🎪', label: 'Events', color: '#f87171' },
  REVIEW: { icon: '👀', label: 'Code Review', color: '#2dd4bf' },
  MISSION: { icon: '🎯', label: 'Missions', color: '#fb923c' },
  SYSTEM: { icon: '⚙️', label: 'System', color: '#9ca3af' },
};

export const ReputationPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [summary, setSummary] = useState<RepSummary | null>(null);
  const [history, setHistory] = useState<RepEntry[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'history'>('overview');

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('kldevverse_access_token');
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/gameplay/reputation/summary', { headers: getHeaders() });
      if (res.ok) setSummary(await res.json());
    } catch (err) {
      console.error('[ReputationPanel] Summary fetch failed:', err);
    }
  }, [getHeaders]);

  const fetchHistory = useCallback(async (page: number) => {
    try {
      const res = await fetch(`/api/gameplay/reputation/history?page=${page}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.entries);
        setTotalPages(data.totalPages);
        setHistoryPage(data.page);
      }
    } catch (err) {
      console.error('[ReputationPanel] History fetch failed:', err);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([fetchSummary(), fetchHistory(1)]).finally(() => setLoading(false));
  }, [isOpen, fetchSummary, fetchHistory]);

  if (!isOpen) return null;

  const maxSourceTotal = summary
    ? Math.max(...summary.breakdown.map(b => b.total), 1)
    : 1;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 5, 15, 0.92)', backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'rgba(18, 18, 32, 0.98)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', width: '720px', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(to right, rgba(167,139,250,0.08), transparent)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#fff', fontWeight: 700 }}>
              🤝 Reputation
            </h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '13px' }}>
              Earned through meaningful contributions — never purchased
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#9ca3af', width: '32px', height: '32px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '14px',
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {(['overview', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              style={{
                flex: 1, padding: '10px', border: 'none',
                background: activeView === tab ? 'rgba(255,255,255,0.03)' : 'transparent',
                borderBottom: activeView === tab ? '2px solid #a78bfa' : '2px solid transparent',
                color: activeView === tab ? '#fff' : '#9ca3af',
                fontSize: '13px', fontWeight: activeView === tab ? 600 : 400,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              {tab === 'overview' ? '📊 Overview' : '📜 History'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Loading...</div>
          ) : activeView === 'overview' && summary ? (
            <div>
              {/* Total Score */}
              <div style={{
                textAlign: 'center', padding: '24px', marginBottom: '28px',
                background: 'linear-gradient(135deg, rgba(88,28,135,0.3), rgba(17,24,39,0.6))',
                border: '1px solid rgba(167,139,250,0.2)', borderRadius: '14px',
              }}>
                <div style={{ fontSize: '11px', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>
                  Total Reputation
                </div>
                <div style={{ fontSize: '48px', color: '#fff', fontWeight: 800, margin: '8px 0' }}>
                  {summary.totalReputation.toLocaleString()}
                </div>
              </div>

              {/* Source Breakdown */}
              <h3 style={{ fontSize: '15px', color: '#e5e7eb', margin: '0 0 16px', fontWeight: 600 }}>
                Reputation Sources
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {summary.breakdown.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#4b5563', padding: '24px', fontSize: '13px' }}>
                    No reputation earned yet. Complete missions and help others!
                  </div>
                ) : (
                  summary.breakdown
                    .sort((a, b) => b.total - a.total)
                    .map(b => {
                      const meta = SOURCE_META[b.source] ?? { icon: '❓', label: b.source, color: '#9ca3af' };
                      const widthPercent = (b.total / maxSourceTotal) * 100;
                      return (
                        <div key={b.source} style={{
                          padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '13px', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{meta.icon}</span>
                              <span>{meta.label}</span>
                              <span style={{ fontSize: '11px', color: '#6b7280' }}>({b.count}×)</span>
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: meta.color }}>
                              +{b.total.toLocaleString()}
                            </span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: '2px', background: meta.color,
                              width: `${widthPercent}%`, transition: 'width 0.4s ease',
                            }} />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          ) : activeView === 'history' ? (
            <div>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#4b5563', padding: '40px', fontSize: '13px' }}>
                  No reputation history yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {history.map(entry => {
                    const meta = SOURCE_META[entry.source] ?? { icon: '❓', label: entry.source, color: '#9ca3af' };
                    return (
                      <div key={entry.id} style={{
                        padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px',
                        display: 'flex', alignItems: 'center', gap: '14px',
                      }}>
                        <div style={{ fontSize: '20px' }}>{meta.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', color: '#e5e7eb' }}>{entry.description}</div>
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                            {meta.label} • {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#34d399' }}>
                          +{entry.amount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => fetchHistory(historyPage - 1)}
                    disabled={historyPage <= 1}
                    style={pageBtnStyle(historyPage <= 1)}
                  >← Prev</button>
                  <span style={{ color: '#6b7280', fontSize: '12px', padding: '6px 8px' }}>
                    {historyPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => fetchHistory(historyPage + 1)}
                    disabled={historyPage >= totalPages}
                    style={pageBtnStyle(historyPage >= totalPages)}
                  >Next →</button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const pageBtnStyle = (disabled: boolean) => ({
  padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)',
  background: disabled ? 'transparent' : 'rgba(255,255,255,0.05)',
  color: disabled ? '#4b5563' : '#9ca3af', fontSize: '12px',
  cursor: disabled ? 'default' as const : 'pointer' as const,
  fontFamily: "'Inter', sans-serif",
});
