// ── KL DevVerse — Skill Tree Panel ───────────────────────────────────
// Visual skill tree with 10 branches, node connections, and invest flow.

import React, { useState, useEffect, useCallback } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';

interface SkillNode {
  skillId: string;
  branch: string;
  tier: number;
  name: string;
  description: string;
  cost: number;
  prerequisite?: string;
  reward?: { type: string; value: string } | null;
  unlocked: boolean;
  unlockedAt: string | null;
  available: boolean;
}

interface SkillTreeState {
  nodes: SkillNode[];
  availablePoints: number;
  totalUnlocked: number;
  totalNodes: number;
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const BRANCH_META: Record<string, { icon: string; color: string; label: string }> = {
  AI: { icon: '🤖', color: '#818cf8', label: 'AI' },
  ML: { icon: '🧠', color: '#c084fc', label: 'Machine Learning' },
  FULLSTACK: { icon: '🌐', color: '#60a5fa', label: 'Fullstack' },
  CLOUD: { icon: '☁️', color: '#38bdf8', label: 'Cloud' },
  CYBERSECURITY: { icon: '🔐', color: '#f87171', label: 'Cybersecurity' },
  GAMEDEV: { icon: '🎮', color: '#fb923c', label: 'Game Dev' },
  ROBOTICS: { icon: '🦾', color: '#a3e635', label: 'Robotics' },
  OPENSOURCE: { icon: '💚', color: '#34d399', label: 'Open Source' },
  UIUX: { icon: '🎨', color: '#f472b6', label: 'UI/UX' },
  DATASCIENCE: { icon: '📊', color: '#fbbf24', label: 'Data Science' },
};

export const SkillTreePanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [tree, setTree] = useState<SkillTreeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('AI');
  const [investing, setInvesting] = useState<string | null>(null);
  const pushNotification = useNotificationStore(s => s.push);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('kldevverse_access_token');
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gameplay/skills', { headers: getHeaders() });
      if (res.ok) setTree(await res.json());
    } catch (err) {
      console.error('[SkillTreePanel] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (isOpen) fetchTree();
  }, [isOpen, fetchTree]);

  const handleInvest = async (skillId: string) => {
    setInvesting(skillId);
    try {
      const res = await fetch('/api/gameplay/skills/invest', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ skillId }),
      });
      if (res.ok) {
        const data = await res.json();
        pushNotification({
          type: 'cash_earned',
          title: 'Skill Unlocked!',
          message: `${data.node.skillId} unlocked! ${data.pointsRemaining} points remaining.`,
          icon: '🔓',
          color: '#818cf8',
          priority: 'high',
          duration: 3000,
        });
        fetchTree();
      } else {
        const err = await res.json().catch(() => ({}));
        pushNotification({
          type: 'generic',
          title: 'Cannot Unlock',
          message: err.message || 'Failed to invest skill point',
          icon: '❌',
          color: '#ef4444',
          priority: 'normal',
          duration: 3000,
        });
      }
    } catch (err) {
      console.error('Invest failed:', err);
    } finally {
      setInvesting(null);
    }
  };

  if (!isOpen) return null;

  const branchNodes = tree?.nodes.filter(n => n.branch === selectedBranch).sort((a, b) => a.tier - b.tier) ?? [];
  const branchMeta = BRANCH_META[selectedBranch] ?? { icon: '❓', color: '#9ca3af', label: selectedBranch };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', background: 'rgba(5, 5, 15, 0.95)',
      backdropFilter: 'blur(12px)', fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Branch Sidebar ───────────────────────────────────── */}
      <div style={{
        width: '200px', borderRight: '1px solid rgba(255,255,255,0.06)',
        padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px',
        overflowY: 'auto',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🌳</span> Skill Tree
        </div>

        {tree && (
          <div style={{
            padding: '10px 12px', marginBottom: '12px', borderRadius: '8px',
            background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)',
          }}>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>Available Points</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#60a5fa' }}>{tree.availablePoints}</div>
            <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
              {tree.totalUnlocked}/{tree.totalNodes} unlocked
            </div>
          </div>
        )}

        {Object.entries(BRANCH_META).map(([key, meta]) => {
          const branchUnlocked = tree?.nodes.filter(n => n.branch === key && n.unlocked).length ?? 0;
          return (
            <button
              key={key}
              onClick={() => setSelectedBranch(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 10px', borderRadius: '8px', border: 'none',
                background: selectedBranch === key ? `${meta.color}18` : 'transparent',
                color: selectedBranch === key ? meta.color : '#9ca3af',
                fontSize: '12px', fontWeight: selectedBranch === key ? 600 : 400,
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
            >
              <span>{meta.icon}</span>
              <span style={{ flex: 1 }}>{meta.label}</span>
              {branchUnlocked > 0 && (
                <span style={{ fontSize: '10px', color: '#6b7280' }}>{branchUnlocked}/5</span>
              )}
            </button>
          );
        })}

        <button onClick={onClose} style={{
          marginTop: 'auto', padding: '10px', borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
          color: '#9ca3af', fontSize: '12px', cursor: 'pointer',
        }}>← Back to World</button>
      </div>

      {/* ── Main Content: Skill Nodes ────────────────────────── */}
      <div style={{ flex: 1, padding: '32px 48px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <span style={{ fontSize: '32px' }}>{branchMeta.icon}</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#fff', fontWeight: 700 }}>{branchMeta.label}</h2>
            <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>
              {branchNodes.filter(n => n.unlocked).length} / {branchNodes.length} nodes unlocked
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '60px' }}>Loading skill tree...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
            {branchNodes.map((node, idx) => (
              <React.Fragment key={node.skillId}>
                {/* Connector line */}
                {idx > 0 && (
                  <div style={{
                    width: '2px', height: '20px', marginLeft: '23px',
                    background: node.unlocked || branchNodes[idx - 1]?.unlocked
                      ? branchMeta.color
                      : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s',
                  }} />
                )}

                {/* Node Card */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px',
                  padding: '16px 20px', borderRadius: '12px',
                  background: node.unlocked
                    ? `${branchMeta.color}10`
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${node.unlocked
                    ? `${branchMeta.color}30`
                    : node.available ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}`,
                  opacity: !node.unlocked && !node.available ? 0.5 : 1,
                  transition: 'all 0.3s',
                }}>
                  {/* Tier Badge */}
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '50%',
                    background: node.unlocked ? `${branchMeta.color}25` : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${node.unlocked ? branchMeta.color : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: node.unlocked ? '20px' : '16px', flexShrink: 0,
                    color: node.unlocked ? branchMeta.color : '#4b5563',
                    fontWeight: 700,
                  }}>
                    {node.unlocked ? '✓' : node.tier}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: node.unlocked ? '#fff' : '#d1d5db' }}>
                        {node.name}
                      </span>
                      <span style={{
                        fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)', color: '#6b7280',
                      }}>
                        {node.cost} pts
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>{node.description}</p>
                    {node.reward && (
                      <div style={{ fontSize: '11px', color: branchMeta.color, marginTop: '4px' }}>
                        🎁 Unlocks title: "{node.reward.value}"
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  {node.available && !node.unlocked && (tree?.availablePoints ?? 0) >= node.cost && (
                    <button
                      onClick={() => handleInvest(node.skillId)}
                      disabled={investing === node.skillId}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none',
                        background: branchMeta.color, color: '#000', fontSize: '12px',
                        fontWeight: 600, cursor: investing === node.skillId ? 'wait' : 'pointer',
                        opacity: investing === node.skillId ? 0.6 : 1,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {investing === node.skillId ? '...' : 'Unlock'}
                    </button>
                  )}
                  {node.unlocked && (
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>Unlocked</span>
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
