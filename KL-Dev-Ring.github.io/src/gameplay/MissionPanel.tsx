// ── KL DevVerse — Mission Panel ────────────────────────────────────────
// Tabbed panel for Daily, Weekly, Monthly, and Special missions.
// Shows mission progress, state, and handles claiming rewards.

import React, { useState, useEffect, useCallback } from 'react';
import type { Mission, MissionState, MissionCategory } from './gameplayTypes';
import { useEconomyStore } from '@/stores/economyStore';
import { useNotificationStore } from '@/stores/notificationStore';

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const CATEGORY_TABS: { id: MissionCategory | 'ALL'; label: string; icon: string }[] = [
  { id: 'ALL', label: 'All', icon: '📋' },
  { id: 'DAILY', label: 'Daily', icon: '☀️' },
  { id: 'WEEKLY', label: 'Weekly', icon: '📅' },
  { id: 'SPECIAL', label: 'Special', icon: '✨' }, // Maps to COMMUNITY, HACKATHON, etc. in UI
];

const SPECIAL_CATEGORIES: MissionCategory[] = [
  'SEASONAL', 'COMMUNITY', 'HACKATHON', 'EXPLORATION', 'LEARNING', 'PROJECT', 'OPEN_SOURCE'
];

export const MissionPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<MissionCategory | 'ALL' | 'SPECIAL'>('DAILY');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const { fetchWallet, queueAnimation } = useEconomyStore();
  const pushNotification = useNotificationStore(s => s.push);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kldevverse_access_token');
      const res = await fetch('/api/gameplay/missions', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        // Combine active and available for the UI
        setMissions([...data.active, ...data.available]);
      }
    } catch (err) {
      console.error('[MissionPanel] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchMissions();
  }, [isOpen, fetchMissions]);

  const handleStart = async (id: string) => {
    try {
      const token = localStorage.getItem('kldevverse_access_token');
      const res = await fetch(`/api/gameplay/missions/${id}/start`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        fetchMissions(); // Refresh
      }
    } catch (err) {
      console.error('Failed to start mission', err);
    }
  };

  const handleClaim = async (mission: Mission) => {
    try {
      const token = localStorage.getItem('kldevverse_access_token');
      const res = await fetch(`/api/gameplay/missions/${mission.id}/claim`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        
        // Notify and animate
        pushNotification({
          type: 'cash_earned',
          title: 'Mission Complete!',
          message: `Claimed rewards for ${mission.name}`,
          icon: '🎁',
          color: '#fbbf24',
          priority: 'high',
          duration: 4000
        });

        if (data.cashAwarded > 0) queueAnimation('BUILDER_CASH', data.cashAwarded);
        
        await fetchWallet();
        fetchMissions(); // Refresh list
      }
    } catch (err) {
      console.error('Failed to claim mission', err);
    }
  };

  const filteredMissions = missions.filter(m => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'SPECIAL') return SPECIAL_CATEGORIES.includes(m.category);
    return m.category === activeTab;
  });

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', background: 'rgba(5, 5, 15, 0.95)',
      backdropFilter: 'blur(12px)', fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div style={{
        width: '220px', borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <div style={{
          fontSize: '18px', fontWeight: 700, color: '#f3f4f6',
          marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>🎯</span>
          <span>Missions</span>
        </div>

        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', borderRadius: '8px', border: 'none',
              background: activeTab === tab.id ? 'rgba(96, 165, 250, 0.12)' : 'transparent',
              color: activeTab === tab.id ? '#60a5fa' : '#9ca3af',
              fontSize: '13px', fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}

        <button
          onClick={onClose}
          style={{
            marginTop: 'auto', padding: '10px', borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)', color: '#9ca3af',
            fontSize: '12px', cursor: 'pointer',
          }}
        >
          ← Back to World
        </button>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '24px 32px', overflow: 'auto' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '24px' }}>
          {CATEGORY_TABS.find(t => t.id === activeTab)?.label || 'Special'} Missions
        </h2>

        {loading ? (
          <div style={{ color: '#9ca3af' }}>Loading missions...</div>
        ) : filteredMissions.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '200px', color: '#6b7280',
          }}>
            <span style={{ fontSize: '40px', marginBottom: '12px' }}>📭</span>
            <span>No missions available in this category.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
            {filteredMissions.map(mission => (
              <MissionCard 
                key={mission.id} 
                mission={mission} 
                onStart={() => handleStart(mission.id)}
                onClaim={() => handleClaim(mission)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Mission Card ───────────────────────────────────────────────────

const MissionCard: React.FC<{
  mission: Mission;
  onStart: () => void;
  onClaim: () => void;
}> = ({ mission, onStart, onClaim }) => {
  const isCompleted = mission.state === 'COMPLETED';
  const isRewarded = mission.state === 'REWARDED';
  const isActive = mission.state === 'ACTIVE';
  const isAvailable = mission.state === 'AVAILABLE';

  const progressPercent = Math.min((mission.currentProgress / mission.maxProgress) * 100, 100);

  return (
    <div style={{
      background: 'rgba(20, 20, 35, 0.9)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      opacity: isRewarded ? 0.6 : 1,
    }}>
      {/* Icon */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: isCompleted ? 'rgba(34, 197, 94, 0.15)' : 'rgba(96, 165, 250, 0.15)',
        border: `1px solid ${isCompleted ? 'rgba(34, 197, 94, 0.3)' : 'rgba(96, 165, 250, 0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', flexShrink: 0,
      }}>
        {isCompleted ? '✓' : '🎯'}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f3f4f6', margin: 0 }}>
            {mission.name}
          </h3>
          <span style={{
            fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
            background: 'rgba(255,255,255,0.06)', color: '#9ca3af',
          }}>
            {mission.category}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 12px 0' }}>
          {mission.description}
        </p>

        {/* Progress Bar */}
        {(isActive || isCompleted || isRewarded) && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
              <span>Progress</span>
              <span>{mission.currentProgress} / {mission.maxProgress}</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: isCompleted || isRewarded ? '#22c55e' : '#60a5fa',
                width: `${progressPercent}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Rewards & Action */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px', minWidth: '120px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {mission.cashReward > 0 && (
            <RewardBadge icon="💰" value={mission.cashReward} color="#fbbf24" />
          )}
          {mission.xpReward > 0 && (
            <RewardBadge icon="⭐" value={mission.xpReward} color="#60a5fa" />
          )}
          {mission.repReward > 0 && (
            <RewardBadge icon="🤝" value={mission.repReward} color="#a78bfa" />
          )}
        </div>

        {isAvailable && (
          <button onClick={onStart} style={buttonStyle('#60a5fa')}>Start Mission</button>
        )}
        {isActive && (
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500, padding: '6px 12px' }}>In Progress</span>
        )}
        {isCompleted && (
          <button onClick={onClaim} style={buttonStyle('#22c55e')}>Claim Reward</button>
        )}
        {isRewarded && (
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, padding: '6px 12px' }}>Claimed</span>
        )}
      </div>
    </div>
  );
};

const RewardBadge: React.FC<{ icon: string; value: number; color: string }> = ({ icon, value, color }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '4px 8px', borderRadius: '6px',
    background: `${color}15`, border: `1px solid ${color}30`,
    fontSize: '12px', fontWeight: 600, color
  }}>
    <span>{icon}</span>
    <span>{value}</span>
  </div>
);

const buttonStyle = (color: string) => ({
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  background: color, color: '#000', fontSize: '13px', fontWeight: 600,
  cursor: 'pointer', transition: 'opacity 0.2s', fontFamily: "'Inter', sans-serif"
});
