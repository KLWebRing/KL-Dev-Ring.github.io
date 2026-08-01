// ── KL DevVerse — Quest Tracker ────────────────────────────────────────
// Floating sidebar widget for tracking Daily and Weekly quests.
// Auto-refreshes. Minimizable. Real API integration.

import React, { useState, useEffect, useCallback } from 'react';
import { useEconomyStore } from '@/stores/economyStore';
import { useNotificationStore } from '@/stores/notificationStore';

interface QuestData {
  id: string;
  questId: string;
  name: string;
  description: string;
  type: 'DAILY' | 'WEEKLY';
  currentCount: number;
  targetCount: number;
  completed: boolean;
  claimed: boolean;
  expiresAt: string;
  cashReward: number;
  xpReward: number;
  repReward: number;
}

const API_BASE = '/api/gameplay/quests';

export const QuestTracker: React.FC = () => {
  const [dailyQuests, setDailyQuests] = useState<QuestData[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<QuestData[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const { fetchWallet, queueAnimation } = useEconomyStore();
  const pushNotification = useNotificationStore(s => s.push);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('kldevverse_access_token');
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDailyQuests(data.daily ?? []);
        setWeeklyQuests(data.weekly ?? []);
      }
    } catch (err) {
      console.error('[QuestTracker] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchQuests();
    // Refresh every 60 seconds to catch quest completions from other actions
    const interval = setInterval(fetchQuests, 60_000);
    return () => clearInterval(interval);
  }, [fetchQuests]);

  const handleClaim = async (quest: QuestData) => {
    setClaimingId(quest.id);
    try {
      const res = await fetch(`${API_BASE}/${quest.id}/claim`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();

        pushNotification({
          type: 'cash_earned',
          title: 'Quest Complete!',
          message: `${quest.name}: +${data.cashAwarded}💰 +${data.xpAwarded}⭐`,
          icon: '📜',
          color: '#22c55e',
          priority: 'high',
          duration: 4000,
        });

        if (data.cashAwarded > 0) queueAnimation('BUILDER_CASH', data.cashAwarded);
        await fetchWallet();
        fetchQuests();
      }
    } catch (err) {
      console.error('Claim failed:', err);
    } finally {
      setClaimingId(null);
    }
  };

  const quests = activeTab === 'DAILY' ? dailyQuests : weeklyQuests;
  const completedCount = quests.filter(q => q.completed || q.claimed).length;

  // ── Minimized bubble ─────────────────────────────────────────────

  if (!isExpanded) {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          position: 'fixed', right: '20px', bottom: '100px', zIndex: 100,
          background: 'rgba(20, 20, 35, 0.9)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '50%',
          width: '48px', height: '48px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '24px', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)', transition: 'transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        📜
      </div>
    );
  }

  // ── Expanded panel ────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', right: '20px', top: '90px', zIndex: 100,
      width: '300px', background: 'rgba(15, 15, 25, 0.95)',
      backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px', overflow: 'hidden', fontFamily: "'Inter', sans-serif",
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📜</span>
          <span>Quests</span>
          <span style={{
            fontSize: '11px', padding: '1px 6px', borderRadius: '9px',
            background: 'rgba(96,165,250,0.15)', color: '#60a5fa',
          }}>
            {completedCount}/{quests.length}
          </span>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'transparent', border: 'none', color: '#9ca3af',
            cursor: 'pointer', fontSize: '16px', padding: '2px 6px',
          }}
        >
          ─
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['DAILY', 'WEEKLY'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px', background: activeTab === tab ? 'rgba(255,255,255,0.03)' : 'transparent',
              border: 'none', borderBottom: activeTab === tab ? '2px solid #60a5fa' : '2px solid transparent',
              color: activeTab === tab ? '#fff' : '#9ca3af', fontSize: '12px',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Inter', sans-serif",
            }}
          >
            {tab === 'DAILY' ? '☀️ Daily' : '📅 Weekly'}
          </button>
        ))}
      </div>

      {/* Quest List */}
      <div style={{ padding: '8px', maxHeight: '340px', overflowY: 'auto' }}>
        {loading && quests.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', padding: '20px 0' }}>
            Loading quests...
          </div>
        ) : quests.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', padding: '20px 0' }}>
            No {activeTab.toLowerCase()} quests available.
          </div>
        ) : (
          quests.map(quest => (
            <QuestItem
              key={quest.id}
              quest={quest}
              claiming={claimingId === quest.id}
              onClaim={() => handleClaim(quest)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// ── Individual Quest Item ──────────────────────────────────────────────

const QuestItem: React.FC<{
  quest: QuestData;
  claiming: boolean;
  onClaim: () => void;
}> = ({ quest, claiming, onClaim }) => {
  const progressPercent = Math.min((quest.currentCount / quest.targetCount) * 100, 100);
  const isDone = quest.completed || quest.claimed;

  return (
    <div style={{
      padding: '10px 12px', borderRadius: '8px', marginBottom: '4px',
      background: isDone ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
      border: `1px solid ${isDone ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.04)'}`,
      transition: 'background 0.2s',
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{
          fontSize: '13px', fontWeight: 500,
          color: quest.claimed ? '#6b7280' : '#e5e7eb',
          textDecoration: quest.claimed ? 'line-through' : 'none',
        }}>
          {quest.name}
        </span>
        {/* Reward badges */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {quest.cashReward > 0 && <MiniReward icon="💰" value={quest.cashReward} />}
          {quest.xpReward > 0 && <MiniReward icon="⭐" value={quest.xpReward} />}
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 6px' }}>{quest.description}</p>

      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '2px', transition: 'width 0.3s ease',
            width: `${progressPercent}%`,
            background: isDone ? '#22c55e' : '#60a5fa',
          }} />
        </div>
        <span style={{ fontSize: '10px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
          {quest.currentCount}/{quest.targetCount}
        </span>

        {/* Claim button */}
        {quest.completed && !quest.claimed && (
          <button
            onClick={onClaim}
            disabled={claiming}
            style={{
              padding: '3px 8px', borderRadius: '4px', border: 'none',
              background: '#22c55e', color: '#000', fontSize: '10px', fontWeight: 600,
              cursor: claiming ? 'wait' : 'pointer', opacity: claiming ? 0.6 : 1,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {claiming ? '...' : 'Claim'}
          </button>
        )}
        {quest.claimed && (
          <span style={{ fontSize: '10px', color: '#22c55e' }}>✓</span>
        )}
      </div>
    </div>
  );
};

const MiniReward: React.FC<{ icon: string; value: number }> = ({ icon, value }) => (
  <span style={{ fontSize: '10px', color: '#9ca3af' }}>{icon}{value}</span>
);
