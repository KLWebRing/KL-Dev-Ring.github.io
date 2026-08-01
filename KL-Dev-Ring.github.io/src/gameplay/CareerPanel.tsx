// ── KL DevVerse — Career Panel ─────────────────────────────────────────
// UI for viewing Builder Career, ranks, and milestones.

import React, { useState, useEffect } from 'react';

interface CareerState {
  career: {
    rankName: string;
    totalMissionsCompleted: number;
    totalQuestsCompleted: number;
    totalProjectsShipped: number;
    joinedAt: string;
  };
  milestones: any[];
  rankDetails: {
    current: { rank: number; title: string; requiredXp: number; requiredMissions: number };
    next?: { rank: number; title: string; requiredXp: number; requiredMissions: number };
    progress: { totalXp: number; builderRank: number };
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CareerPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<CareerState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchCareer = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('kldevverse_access_token');
        // Mocking fetch as we haven't built the controller yet for Career
        // const res = await fetch('/api/gameplay/career', ...);
        
        // Mock data for UI preview
        setData({
          career: {
            rankName: 'Junior Builder',
            totalMissionsCompleted: 12,
            totalQuestsCompleted: 45,
            totalProjectsShipped: 2,
            joinedAt: new Date().toISOString(),
          },
          milestones: [
            { id: '1', name: 'Promoted to Junior Builder', achievedAt: new Date().toISOString() },
          ],
          rankDetails: {
            current: { rank: 2, title: 'Junior Builder', requiredXp: 1000, requiredMissions: 5 },
            next: { rank: 3, title: 'Mid-Level Builder', requiredXp: 3000, requiredMissions: 15 },
            progress: { totalXp: 2150, builderRank: 2 },
          }
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCareer();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 5, 15, 0.9)', backdropFilter: 'blur(8px)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: 'rgba(20, 20, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px', width: '800px', height: '600px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0,0,0,0.6)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(to right, rgba(96, 165, 250, 0.1), transparent)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#fff' }}>Builder Career</h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '14px' }}>
              Your journey and progression in KL DevVerse
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff',
            width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer',
          }}>✕</button>
        </div>

        {loading || !data ? (
          <div style={{ padding: '40px', color: '#9ca3af', textAlign: 'center' }}>Loading career data...</div>
        ) : (
          <div style={{ padding: '32px', display: 'flex', gap: '32px', overflowY: 'auto' }}>
            
            {/* Left Col: Rank & Stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Rank Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30,58,138,0.5), rgba(17,24,39,0.8))',
                border: '1px solid rgba(96,165,250,0.3)', borderRadius: '12px', padding: '24px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                  {data.rankDetails.current.rank >= 5 ? '👑' : '⭐'}
                </div>
                <div style={{ fontSize: '14px', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
                  Rank {data.rankDetails.current.rank}
                </div>
                <h3 style={{ fontSize: '28px', color: '#fff', margin: '4px 0 16px' }}>
                  {data.rankDetails.current.title}
                </h3>
                
                {data.rankDetails.next && (
                  <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Next: {data.rankDetails.next.title}</span>
                      <span>{data.rankDetails.progress.totalXp} / {data.rankDetails.next.requiredXp} XP</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', background: '#60a5fa',
                        width: `${Math.min((data.rankDetails.progress.totalXp / data.rankDetails.next.requiredXp) * 100, 100)}%`
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <StatBox label="Missions" value={data.career.totalMissionsCompleted} icon="🎯" />
                <StatBox label="Quests" value={data.career.totalQuestsCompleted} icon="📜" />
                <StatBox label="Projects" value={data.career.totalProjectsShipped} icon="🚀" />
                <StatBox label="Total XP" value={data.rankDetails.progress.totalXp} icon="⭐" />
              </div>
            </div>

            {/* Right Col: Milestones */}
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', color: '#f3f4f6', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏆</span> Milestones
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {data.milestones.map((m, i) => (
                  <div key={i} style={{
                    padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px'
                  }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 500, fontSize: '14px' }}>{m.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                        {new Date(m.achievedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: number; icon: string }> = ({ label, value, icon }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
    padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px'
  }}>
    <div style={{ fontSize: '24px' }}>{icon}</div>
    <div>
      <div style={{ color: '#9ca3af', fontSize: '12px' }}>{label}</div>
      <div style={{ color: '#fff', fontSize: '20px', fontWeight: 600 }}>{value}</div>
    </div>
  </div>
);
