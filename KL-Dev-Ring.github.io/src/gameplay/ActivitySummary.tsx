// ── KL DevVerse — Activity Summary ───────────────────────────────────
// Compact card showing player activity stats and recent session info.

import React, { useState, useEffect, useCallback } from 'react';

interface ActivitySummaryData {
  totalActions: number;
  recentSessions: number;
  breakdown: Array<{ action: string; count: number }>;
}

const ACTION_META: Record<string, { icon: string; label: string }> = {
  SESSION_START: { icon: '🔵', label: 'Sessions' },
  EXPLORE: { icon: '🗺️', label: 'Explorations' },
  STUDIO_VISIT: { icon: '🏠', label: 'Studio Visits' },
  PROJECT_VIEW: { icon: '📂', label: 'Projects Viewed' },
  PROJECT_SHARE: { icon: '🚀', label: 'Projects Shared' },
  FURNITURE_PLACE: { icon: '🪑', label: 'Items Placed' },
  EVENT_JOIN: { icon: '🎪', label: 'Events Joined' },
  MISSION_COMPLETE: { icon: '🎯', label: 'Missions' },
  QUEST_COMPLETE: { icon: '📜', label: 'Quests' },
  MARKETPLACE_PURCHASE: { icon: '🛒', label: 'Purchases' },
  SKILL_INVEST: { icon: '🧠', label: 'Skills Invested' },
};

export const ActivitySummary: React.FC = () => {
  const [data, setData] = useState<ActivitySummaryData | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const token = localStorage.getItem('kldevverse_access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/gameplay/activity/summary', { headers });
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('[ActivitySummary] Fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  if (!data) return null;

  // Top 4 actions by count
  const topActions = [...data.breakdown]
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  return (
    <div style={{
      background: 'rgba(18, 18, 32, 0.9)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px',
      padding: '16px', fontFamily: "'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px',
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#f3f4f6' }}>📊 Activity</span>
        <span style={{ fontSize: '11px', color: '#6b7280' }}>
          {data.recentSessions} sessions this week
        </span>
      </div>

      {/* Total */}
      <div style={{
        textAlign: 'center', padding: '12px', marginBottom: '12px',
        background: 'rgba(96,165,250,0.06)', borderRadius: '8px',
        border: '1px solid rgba(96,165,250,0.1)',
      }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#60a5fa' }}>
          {data.totalActions.toLocaleString()}
        </div>
        <div style={{ fontSize: '11px', color: '#9ca3af' }}>Total Actions</div>
      </div>

      {/* Top Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
        {topActions.map(a => {
          const meta = ACTION_META[a.action] ?? { icon: '📌', label: a.action };
          return (
            <div key={a.action} style={{
              padding: '8px 10px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ fontSize: '14px' }}>{meta.icon}</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>
                  {a.count}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>{meta.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
