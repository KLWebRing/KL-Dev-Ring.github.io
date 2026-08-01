// ── KL DevVerse — Career Panel ─────────────────────────────────────────
// Full-screen modal for viewing Builder Career: rank, stats, milestones.
// Fetches real data from /api/gameplay/career.

import React, { useState, useEffect, useCallback } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';

interface RankTier {
  rank: number;
  title: string;
  requiredXp: number;
  requiredMissions: number;
}

interface CareerState {
  career: {
    rankName: string;
    totalMissionsCompleted: number;
    totalQuestsCompleted: number;
    totalProjectsShipped: number;
    joinedAt: string;
  };
  milestones: Array<{ id: string; milestoneId: string; name: string; description: string; achievedAt: string }>;
  rankDetails: {
    current: RankTier;
    next?: RankTier;
    progress: { totalXp: number; builderRank: number; level: number; careerTitle: string };
  };
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const RANK_ICONS: Record<number, string> = {
  1: '🌱', 2: '🔨', 3: '⚡', 4: '🔥', 5: '👑', 6: '💎', 7: '🌟', 8: '🏛️', 9: '🐉',
};

export const CareerPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<CareerState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCareer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('kldevverse_access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/gameplay/career', { headers });
      if (res.ok) {
        setData(await res.json());
      } else {
        setError('Failed to load career data');
      }
    } catch (err) {
      console.error('[CareerPanel] Fetch failed:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchCareer();
  }, [isOpen, fetchCareer]);

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
        borderRadius: '16px', width: '860px', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* ── Header ────────────────────────────────────────────── */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(to right, rgba(96, 165, 250, 0.08), transparent)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#fff', fontWeight: 700 }}>
              🏆 Builder Career
            </h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '13px' }}>
              Your progression journey in KL DevVerse
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#9ca3af', width: '32px', height: '32px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s',
          }}>✕</button>
        </div>

        {/* ── Body ──────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
              Loading career data...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', color: '#ef4444', padding: '60px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
              {error}
            </div>
          ) : data ? (
            <div style={{ display: 'flex', gap: '28px' }}>
              {/* ── Left: Rank + Stats ──────────────────────────── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Rank Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(30,58,138,0.4), rgba(17,24,39,0.7))',
                  border: '1px solid rgba(96,165,250,0.2)', borderRadius: '14px',
                  padding: '28px', textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '56px', marginBottom: '4px',
                    filter: 'drop-shadow(0 0 12px rgba(96,165,250,0.3))',
                  }}>
                    {RANK_ICONS[data.rankDetails.current.rank] ?? '⭐'}
                  </div>
                  <div style={{
                    fontSize: '11px', color: '#60a5fa', textTransform: 'uppercase',
                    letterSpacing: '2px', fontWeight: 700, marginBottom: '4px',
                  }}>
                    RANK {data.rankDetails.current.rank}
                  </div>
                  <h3 style={{ fontSize: '26px', color: '#fff', margin: '4px 0 20px', fontWeight: 700 }}>
                    {data.rankDetails.current.title}
                  </h3>

                  {/* Next Rank Progress */}
                  {data.rankDetails.next && (
                    <div style={{
                      background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px',
                      textAlign: 'left',
                    }}>
                      <div style={{
                        fontSize: '11px', color: '#9ca3af', marginBottom: '8px',
                        display: 'flex', justifyContent: 'space-between',
                      }}>
                        <span>Next: <span style={{ color: '#60a5fa' }}>{data.rankDetails.next.title}</span></span>
                        <span>{data.rankDetails.progress.totalXp.toLocaleString()} / {data.rankDetails.next.requiredXp.toLocaleString()} XP</span>
                      </div>
                      <div style={{
                        height: '8px', background: 'rgba(255,255,255,0.08)',
                        borderRadius: '4px', overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', borderRadius: '4px',
                          background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                          width: `${Math.min((data.rankDetails.progress.totalXp / data.rankDetails.next.requiredXp) * 100, 100)}%`,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      {/* Missions requirement */}
                      <div style={{
                        fontSize: '11px', color: '#6b7280', marginTop: '8px',
                        display: 'flex', justifyContent: 'space-between',
                      }}>
                        <span>Missions Required</span>
                        <span>{data.career.totalMissionsCompleted} / {data.rankDetails.next.requiredMissions}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <StatBox icon="🎯" label="Missions" value={data.career.totalMissionsCompleted} />
                  <StatBox icon="📜" label="Quests" value={data.career.totalQuestsCompleted} />
                  <StatBox icon="🚀" label="Projects" value={data.career.totalProjectsShipped} />
                  <StatBox icon="⭐" label="Total XP" value={data.rankDetails.progress.totalXp} />
                </div>

                {/* Member Since */}
                <div style={{
                  fontSize: '12px', color: '#6b7280', textAlign: 'center',
                  padding: '8px', borderTop: '1px solid rgba(255,255,255,0.04)',
                }}>
                  Member since {new Date(data.career.joinedAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </div>
              </div>

              {/* ── Right: Milestones ──────────────────────────── */}
              <div style={{ flex: 1 }}>
                <h3 style={{
                  fontSize: '16px', color: '#f3f4f6', margin: '0 0 16px',
                  display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600,
                }}>
                  <span>🏅</span> Milestones
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '9px',
                    background: 'rgba(255,255,255,0.05)', color: '#9ca3af', fontWeight: 400,
                  }}>{data.milestones.length}</span>
                </h3>

                {data.milestones.length === 0 ? (
                  <div style={{
                    padding: '40px 20px', textAlign: 'center', color: '#4b5563',
                    border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '10px',
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎯</div>
                    <p style={{ margin: 0, fontSize: '13px' }}>
                      Complete missions and level up to earn milestones!
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.milestones.map((m) => (
                      <div key={m.id} style={{
                        padding: '14px 16px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', gap: '14px',
                        transition: 'background 0.2s',
                      }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '16px', flexShrink: 0,
                        }}>✓</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#e5e7eb', fontWeight: 500, fontSize: '13px' }}>{m.name}</div>
                          {m.description && (
                            <div style={{ color: '#6b7280', fontSize: '11px', marginTop: '2px' }}>{m.description}</div>
                          )}
                        </div>
                        <div style={{ color: '#4b5563', fontSize: '11px', whiteSpace: 'nowrap' }}>
                          {new Date(m.achievedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ── Stat Box ─────────────────────────────────────────────────────────

const StatBox: React.FC<{ icon: string; label: string; value: number }> = ({ icon, label, value }) => (
  <div style={{
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
    padding: '16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '14px',
  }}>
    <div style={{ fontSize: '22px' }}>{icon}</div>
    <div>
      <div style={{ color: '#6b7280', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ color: '#fff', fontSize: '20px', fontWeight: 700 }}>{value.toLocaleString()}</div>
    </div>
  </div>
);
