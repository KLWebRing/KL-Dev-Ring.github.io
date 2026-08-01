// ── KL DevVerse — Quest Tracker ────────────────────────────────────────
// Floating widget for tracking Daily and Weekly quests.
// Can be minimized or expanded.

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

export const QuestTracker: React.FC = () => {
  const [quests, setQuests] = useState<QuestData[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'DAILY' | 'WEEKLY'>('DAILY');
  const [loading, setLoading] = useState(false);

  const { fetchWallet, queueAnimation } = useEconomyStore();
  const pushNotification = useNotificationStore(s => s.push);

  const fetchQuests = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kldevverse_access_token');
      // In a real app we'd have a QuestController.
      // Mocking fetch logic since we don't have the controller yet.
      // Normally: const res = await fetch('/api/gameplay/quests', ...)
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  const handleClaim = async (questId: string) => {
    // API Call
  };

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
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}
      >
        📜
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', right: '20px', top: '90px', zIndex: 100,
      width: '280px', background: 'rgba(15, 15, 25, 0.95)',
      backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '12px', overflow: 'hidden', fontFamily: "'Inter', sans-serif",
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📜</span>
          <span>Active Quests</span>
        </div>
        <button 
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'transparent', border: 'none', color: '#9ca3af',
            cursor: 'pointer', fontSize: '16px'
          }}
        >
          _
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setActiveTab('DAILY')}
          style={tabStyle(activeTab === 'DAILY')}
        >
          Daily
        </button>
        <button
          onClick={() => setActiveTab('WEEKLY')}
          style={tabStyle(activeTab === 'WEEKLY')}
        >
          Weekly
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px', padding: '20px 0' }}>
          No quests active yet.
          <br/>
          (Will auto-populate from events)
        </div>
      </div>
    </div>
  );
};

const tabStyle = (active: boolean) => ({
  flex: 1, padding: '8px', background: active ? 'rgba(255,255,255,0.03)' : 'transparent',
  border: 'none', borderBottom: active ? '2px solid #60a5fa' : '2px solid transparent',
  color: active ? '#fff' : '#9ca3af', fontSize: '12px', fontWeight: active ? 600 : 400,
  cursor: 'pointer' as const, transition: 'all 0.2s', fontFamily: "'Inter', sans-serif"
});
