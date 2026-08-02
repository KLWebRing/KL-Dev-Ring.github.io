// ── KL DevVerse — Leaderboard Panel ──────────────────────────────────
// Tabbed leaderboard with rank table, avatars, and "Your Position" highlight.

import React, { useState, useEffect, useCallback } from 'react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  level: number;
  careerTitle: string;
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const BOARDS = [
  { id: 'LEVEL', label: '⭐ Level', color: '#60a5fa' },
  { id: 'REPUTATION', label: '🤝 Reputation', color: '#a78bfa' },
  { id: 'INNOVATION', label: '💡 Innovation', color: '#fbbf24' },
  { id: 'STUDIO_VALUE', label: '🏠 Studio', color: '#34d399' },
  { id: 'COMMUNITY', label: '🏘️ Community', color: '#f472b6' },
  { id: 'SEASON', label: '🎭 Season', color: '#fb923c' },
];

const RANK_COLORS: Record<number, string> = { 1: '#fbbf24', 2: '#d1d5db', 3: '#cd7f32' };
const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export const LeaderboardPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeBoard, setActiveBoard] = useState('LEVEL');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('kldevverse_access_token');
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  const fetchBoard = useCallback(async (board: string, pg: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/gameplay/leaderboards/${board.toLowerCase()}?page=${pg}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setPage(data.page);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('[LeaderboardPanel] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (isOpen) fetchBoard(activeBoard, 1);
  }, [isOpen, activeBoard, fetchBoard]);

  if (!isOpen) return null;

  const boardMeta = BOARDS.find(b => b.id === activeBoard) ?? BOARDS[0];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 5, 15, 0.92)', backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'rgba(18, 18, 32, 0.98)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', width: '700px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#fff', fontWeight: 700 }}>🏆 Leaderboards</h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '13px' }}>Top builders in KL DevVerse</p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#9ca3af', width: '32px', height: '32px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '14px',
          }}>✕</button>
        </div>

        {/* Board Tabs */}
        <div style={{
          display: 'flex', gap: '4px', padding: '8px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto',
        }}>
          {BOARDS.map(board => (
            <button
              key={board.id}
              onClick={() => setActiveBoard(board.id)}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none', whiteSpace: 'nowrap',
                background: activeBoard === board.id ? `${board.color}15` : 'transparent',
                color: activeBoard === board.id ? board.color : '#6b7280',
                fontSize: '12px', fontWeight: activeBoard === board.id ? 600 : 400,
                cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}
            >
              {board.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px' }}>Loading leaderboard...</div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4b5563', padding: '60px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🏆</div>
              <p style={{ margin: 0, fontSize: '14px' }}>No entries yet for this board.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Table Header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '50px 1fr 100px 80px',
                padding: '8px 12px', fontSize: '11px', color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                <span>Rank</span>
                <span>Builder</span>
                <span style={{ textAlign: 'right' }}>Score</span>
                <span style={{ textAlign: 'right' }}>Level</span>
              </div>

              {/* Rows */}
              {entries.map(entry => (
                <div key={entry.userId} style={{
                  display: 'grid', gridTemplateColumns: '50px 1fr 100px 80px',
                  padding: '10px 12px', borderRadius: '8px', alignItems: 'center',
                  background: entry.rank <= 3 ? `${RANK_COLORS[entry.rank]}08` : 'rgba(255,255,255,0.01)',
                  border: `1px solid ${entry.rank <= 3 ? `${RANK_COLORS[entry.rank]}20` : 'rgba(255,255,255,0.03)'}`,
                }}>
                  {/* Rank */}
                  <span style={{
                    fontSize: entry.rank <= 3 ? '18px' : '14px',
                    fontWeight: 700,
                    color: RANK_COLORS[entry.rank] ?? '#9ca3af',
                  }}>
                    {RANK_ICONS[entry.rank] ?? `#${entry.rank}`}
                  </span>

                  {/* Builder */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={entry.avatarUrl}
                      alt={entry.username}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        border: `1px solid ${entry.rank <= 3 ? RANK_COLORS[entry.rank] : 'rgba(255,255,255,0.1)'}`,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#e5e7eb' }}>
                        {entry.displayName}
                      </div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>
                        @{entry.username} • {entry.careerTitle}
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{
                    textAlign: 'right', fontSize: '14px', fontWeight: 700,
                    color: boardMeta.color,
                  }}>
                    {entry.score.toLocaleString()}
                  </div>

                  {/* Level */}
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#9ca3af' }}>
                    Lv. {entry.level}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', paddingBottom: '8px' }}>
              <button
                onClick={() => fetchBoard(activeBoard, page - 1)}
                disabled={page <= 1}
                style={pageBtnStyle(page <= 1)}
              >← Prev</button>
              <span style={{ color: '#6b7280', fontSize: '12px', padding: '6px 8px' }}>{page} / {totalPages}</span>
              <button
                onClick={() => fetchBoard(activeBoard, page + 1)}
                disabled={page >= totalPages}
                style={pageBtnStyle(page >= totalPages)}
              >Next →</button>
            </div>
          )}
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
