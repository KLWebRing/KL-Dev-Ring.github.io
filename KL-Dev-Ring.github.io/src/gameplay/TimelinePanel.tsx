// ── KL DevVerse — Timeline Panel ─────────────────────────────────────
// Vertical timeline showing significant events in a builder's journey.

import React, { useState, useEffect, useCallback } from 'react';

interface TimelineEntry {
  id: string;
  entryType: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  isPublic: boolean;
  createdAt: string;
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly targetUserId?: string; // If viewing another user's timeline
}

const TYPE_META: Record<string, { icon: string; color: string }> = {
  JOINED: { icon: '🌟', color: '#fbbf24' },
  STUDIO_CREATED: { icon: '🏠', color: '#60a5fa' },
  PROJECT_PUBLISHED: { icon: '🚀', color: '#a78bfa' },
  HACKATHON_WON: { icon: '🏆', color: '#fbbf24' },
  LEVEL_UP: { icon: '⬆️', color: '#34d399' },
  STUDIO_UPGRADE: { icon: '🔨', color: '#fb923c' },
  FEATURED: { icon: '⭐', color: '#f472b6' },
  MISSION_COMPLETED: { icon: '🎯', color: '#22c55e' },
  CAREER_MILESTONE: { icon: '🏅', color: '#fbbf24' },
  ACHIEVEMENT_UNLOCKED: { icon: '🔓', color: '#818cf8' },
  SKILL_UNLOCKED: { icon: '🧠', color: '#c084fc' },
  RANK_UP: { icon: '👑', color: '#f59e0b' },
};

export const TimelinePanel: React.FC<Props> = ({ isOpen, onClose, targetUserId }) => {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('kldevverse_access_token');
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  const fetchTimeline = useCallback(async (pg: number) => {
    setLoading(true);
    try {
      const endpoint = targetUserId
        ? `/api/gameplay/timeline/user/${targetUserId}?page=${pg}`
        : `/api/gameplay/timeline?page=${pg}`;
      const res = await fetch(endpoint, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
        setPage(data.page);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error('[TimelinePanel] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders, targetUserId]);

  useEffect(() => {
    if (isOpen) fetchTimeline(1);
  }, [isOpen, fetchTimeline]);

  if (!isOpen) return null;

  // Group entries by date
  const grouped = new Map<string, TimelineEntry[]>();
  for (const entry of entries) {
    const dateKey = new Date(entry.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(entry);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 5, 15, 0.92)', backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'rgba(18, 18, 32, 0.98)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', width: '600px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#fff', fontWeight: 700 }}>
              📅 Timeline
            </h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '13px' }}>
              {targetUserId ? 'Public journey' : 'Your journey in KL DevVerse'}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#9ca3af', width: '32px', height: '32px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '14px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px' }}>Loading timeline...</div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4b5563', padding: '60px' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📅</div>
              <p style={{ margin: 0, fontSize: '14px' }}>No timeline entries yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                Complete missions and unlock achievements to build your timeline!
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical line */}
              <div style={{
                position: 'absolute', left: '15px', top: '0', bottom: '0',
                width: '2px', background: 'rgba(255,255,255,0.06)',
              }} />

              {Array.from(grouped.entries()).map(([dateStr, dateEntries]) => (
                <div key={dateStr} style={{ marginBottom: '24px' }}>
                  {/* Date header */}
                  <div style={{
                    position: 'relative', paddingLeft: '40px', marginBottom: '12px',
                  }}>
                    <div style={{
                      position: 'absolute', left: '8px', top: '4px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: 'rgba(96,165,250,0.2)', border: '2px solid #60a5fa',
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af' }}>{dateStr}</span>
                  </div>

                  {/* Entries */}
                  {dateEntries.map(entry => {
                    const meta = TYPE_META[entry.entryType] ?? { icon: '📌', color: '#9ca3af' };
                    return (
                      <div key={entry.id} style={{
                        position: 'relative', paddingLeft: '40px', marginBottom: '8px',
                      }}>
                        {/* Dot */}
                        <div style={{
                          position: 'absolute', left: '11px', top: '12px',
                          width: '10px', height: '10px', borderRadius: '50%',
                          background: meta.color,
                        }} />
                        {/* Card */}
                        <div style={{
                          padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.04)', borderRadius: '10px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>{meta.icon}</span>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#e5e7eb' }}>{entry.title}</span>
                          </div>
                          {entry.description && (
                            <p style={{ margin: '4px 0 0 24px', fontSize: '12px', color: '#6b7280' }}>
                              {entry.description}
                            </p>
                          )}
                          <div style={{ marginTop: '4px', marginLeft: '24px', fontSize: '10px', color: '#4b5563' }}>
                            {new Date(entry.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            {!entry.isPublic && <span style={{ marginLeft: '6px', color: '#6b7280' }}>🔒 Private</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => fetchTimeline(page - 1)}
                disabled={page <= 1}
                style={pageBtnStyle(page <= 1)}
              >← Prev</button>
              <span style={{ color: '#6b7280', fontSize: '12px', padding: '6px 8px' }}>{page} / {totalPages}</span>
              <button
                onClick={() => fetchTimeline(page + 1)}
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
