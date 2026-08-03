// ── KL DevVerse — Studio Evolution Panel ─────────────────────────────
// Shows current evolution stage, progress towards next stage, and
// the auto-furniture that has been unlocked.

import React, { useState, useEffect, useCallback } from 'react';

interface EvolutionState {
  stage: string;
  stageIndex: number;
  label: string;
  description: string;
  autoFurniture: string[];
  totalStages: number;
  nextStage: {
    stage: string;
    label: string;
    requirements: Record<string, number>;
  } | null;
  lastEvolved: string | null;
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const STAGE_VISUALS: Record<string, { icon: string; color: string; gradient: string }> = {
  DESK:      { icon: '💻', color: '#9ca3af', gradient: 'linear-gradient(135deg, #374151, #1f2937)' },
  WORKSPACE: { icon: '🖥️', color: '#60a5fa', gradient: 'linear-gradient(135deg, #1e3a5f, #172554)' },
  LAB:       { icon: '🔬', color: '#a78bfa', gradient: 'linear-gradient(135deg, #4c1d95, #2e1065)' },
  WING:      { icon: '🏢', color: '#34d399', gradient: 'linear-gradient(135deg, #065f46, #064e3b)' },
  CAMPUS:    { icon: '🏫', color: '#fbbf24', gradient: 'linear-gradient(135deg, #78350f, #451a03)' },
  HQ:        { icon: '🏛️', color: '#f472b6', gradient: 'linear-gradient(135deg, #831843, #500724)' },
};

const REQUIREMENT_LABELS: Record<string, { icon: string; label: string }> = {
  minProjects: { icon: '📂', label: 'Projects' },
  minLevel: { icon: '⭐', label: 'Level' },
  minReputation: { icon: '🤝', label: 'Reputation' },
  minSkillNodes: { icon: '🧠', label: 'Skills' },
  minAchievements: { icon: '🏆', label: 'Achievements' },
  minCareerRank: { icon: '👑', label: 'Career Rank' },
  minInnovationScore: { icon: '💡', label: 'Innovation' },
};

export const StudioEvolution: React.FC<Props> = ({ isOpen, onClose }) => {
  const [state, setState] = useState<EvolutionState | null>(null);
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('kldevverse_access_token');
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  const fetchState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ecosystem/evolution', { headers: getHeaders() });
      if (res.ok) setState(await res.json());
    } catch (err) {
      console.error('[StudioEvolution] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (isOpen) fetchState();
  }, [isOpen, fetchState]);

  if (!isOpen) return null;

  const vis = STAGE_VISUALS[state?.stage ?? 'DESK'] ?? STAGE_VISUALS.DESK!;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 5, 15, 0.92)', backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'rgba(18, 18, 32, 0.98)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', width: '640px', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: vis.gradient,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#fff', fontWeight: 700 }}>
              🏗️ Studio Evolution
            </h2>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
              Your studio evolves automatically as you grow
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', width: '32px', height: '32px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '14px',
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {loading || !state ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Loading evolution state...</div>
          ) : (
            <>
              {/* Current Stage Card */}
              <div style={{
                textAlign: 'center', padding: '28px', marginBottom: '24px',
                background: vis.gradient, borderRadius: '14px',
                border: `1px solid ${vis.color}30`,
              }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>{vis.icon}</div>
                <div style={{ fontSize: '11px', color: vis.color, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700 }}>
                  Stage {state.stageIndex + 1} of {state.totalStages}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '4px 0' }}>
                  {state.label}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  {state.description}
                </p>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>Evolution Progress</span>
                  <span style={{ fontSize: '12px', color: vis.color }}>
                    {state.stageIndex + 1} / {state.totalStages}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '3px',
                    background: `linear-gradient(90deg, ${vis.color}, ${vis.color}88)`,
                    width: `${((state.stageIndex + 1) / state.totalStages) * 100}%`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>

              {/* Auto-Furniture List */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '14px', color: '#e5e7eb', margin: '0 0 12px', fontWeight: 600 }}>
                  🪑 Auto-Placed Items ({state.autoFurniture.length})
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {state.autoFurniture.map(item => (
                    <span key={item} style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                      background: `${vis.color}12`, border: `1px solid ${vis.color}25`,
                      color: vis.color,
                    }}>
                      {item.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* Next Stage Requirements */}
              {state.nextStage && (
                <div style={{
                  padding: '16px 20px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <h3 style={{ fontSize: '14px', color: '#e5e7eb', margin: '0 0 12px', fontWeight: 600 }}>
                    ⬆️ Next: {state.nextStage.label}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.entries(state.nextStage.requirements).map(([key, value]) => {
                      const meta = REQUIREMENT_LABELS[key] ?? { icon: '📌', label: key };
                      return (
                        <div key={key} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          fontSize: '12px', color: '#9ca3af',
                        }}>
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#6b7280' }}>
                            ≥ {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {state.lastEvolved && (
                <div style={{ fontSize: '11px', color: '#4b5563', textAlign: 'center', marginTop: '16px' }}>
                  Last evolved: {new Date(state.lastEvolved).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
