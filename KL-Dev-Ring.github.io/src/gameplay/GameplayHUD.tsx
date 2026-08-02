// ── KL DevVerse — Gameplay HUD ───────────────────────────────────────
// Master component that renders the quest tracker, nav buttons for all
// gameplay panels, and the panels themselves.
// Drop this into App.tsx and the entire gameplay layer is wired.

import React from 'react';
import { useGameplayStore } from '@/stores/gameplayStore';
import { QuestTracker } from './QuestTracker';
import { CareerPanel } from './CareerPanel';
import { ReputationPanel } from './ReputationPanel';
import { SkillTreePanel } from './SkillTreePanel';
import { TimelinePanel } from './TimelinePanel';
import { LeaderboardPanel } from './LeaderboardPanel';

const NAV_ITEMS = [
  { id: 'career' as const, icon: '🏆', label: 'Career' },
  { id: 'reputation' as const, icon: '🤝', label: 'Reputation' },
  { id: 'skills' as const, icon: '🌳', label: 'Skills' },
  { id: 'timeline' as const, icon: '📅', label: 'Timeline' },
  { id: 'leaderboard' as const, icon: '🏅', label: 'Leaderboards' },
];

export const GameplayHUD: React.FC = () => {
  const { activePanel, openPanel, closePanel } = useGameplayStore();

  return (
    <>
      {/* ── Quest Tracker (always visible) ─────────────────── */}
      <QuestTracker />

      {/* ── Gameplay Nav Bar ──────────────────────────────── */}
      <div style={{
        position: 'fixed', left: '50%', bottom: '16px', transform: 'translateX(-50%)',
        zIndex: 90, display: 'flex', gap: '4px',
        background: 'rgba(12, 12, 24, 0.92)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px',
        padding: '6px 8px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        fontFamily: "'Inter', sans-serif",
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => isActive ? closePanel() : openPanel(item.id)}
              title={item.label}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '2px', padding: '8px 14px', borderRadius: '10px',
                border: 'none', cursor: 'pointer',
                background: isActive ? 'rgba(96,165,250,0.15)' : 'transparent',
                color: isActive ? '#60a5fa' : '#6b7280',
                transition: 'all 0.15s', fontFamily: "'Inter', sans-serif",
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: isActive ? 600 : 400 }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Panels ───────────────────────────────────────── */}
      <CareerPanel isOpen={activePanel === 'career'} onClose={closePanel} />
      <ReputationPanel isOpen={activePanel === 'reputation'} onClose={closePanel} />
      <SkillTreePanel isOpen={activePanel === 'skills'} onClose={closePanel} />
      <TimelinePanel isOpen={activePanel === 'timeline'} onClose={closePanel} />
      <LeaderboardPanel isOpen={activePanel === 'leaderboard'} onClose={closePanel} />
    </>
  );
};
