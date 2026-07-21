// ── KL DevVerse — Leaderboard Modal ──────────────────────────────────

import React, { useState, useMemo } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useWorldStore } from '@/stores/worldStore';
import type { Member } from '@/shared/types';
import { TAG_HUES } from '@/shared/constants';

type TabId = 'all-time' | 'districts' | 'colleges';

function hueFor(tag: string): number {
  return TAG_HUES[tag] ?? 200;
}

const MemberRow: React.FC<{ member: Member; onClick: () => void }> = ({ member, onClick }) => {
  const hue = hueFor(member.tags[0] ?? 'webdev');

  return (
    <tr onClick={onClick}>
      <td><span className="rank-badge">#{member.rank}</span></td>
      <td>
        <div className="builder-identity">
          <div
            className="builder-avatar"
            style={{ background: `hsl(${hue},70%,60%)` }}
          >
            {member.name.charAt(0)}
          </div>
          <div className="builder-meta">
            <strong>{member.name}</strong>
            <small>{member.city}, {member.district}</small>
          </div>
        </div>
      </td>
      <td className="num-col score-col">{member.score}</td>
      <td className="num-col">{member.stats?.streak ?? 0}d</td>
    </tr>
  );
};

export const LeaderboardModal: React.FC = () => {
  const { closeModal, setPassportMember, openModal } = useUIStore();
  const { members, networkData } = useWorldStore();
  const [activeTab, setActiveTab] = useState<TabId>('all-time');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return members.filter(m =>
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.district.toLowerCase().includes(q) ||
      m.tags.some(t => t.includes(q))
    );
  }, [members, query]);

  const handleMemberClick = (member: Member) => {
    setPassportMember(member);
    openModal('passport');
  };

  const districtLeagues = networkData?.districtLeagues.filter(d => d.count > 0).sort((a, b) => b.score - a.score);
  const collegeLeagues = networkData?.collegeLeagues.sort((a, b) => b.score - a.score);

  return (
    <div className="modal-panel leaderboard-modal" style={{ maxWidth: 700 }}>
      <div className="modal-header">
        <span>🏆 TOWN HALL SCOREBOARD / DIRECTORY</span>
        <button className="modal-close" onClick={closeModal} aria-label="Close">×</button>
      </div>

      <div className="search-wrap">
        <span>⌕</span>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Filter by name, district, or skill..."
          autoComplete="off"
        />
      </div>

      <div className="tab-bar">
        {(['all-time', 'districts', 'colleges'] as TabId[]).map(tab => (
          <button
            key={tab}
            className={`tab-btn${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('-', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <div className="modal-body" style={{ padding: '0' }}>
        {activeTab === 'all-time' && (
          <table className="lb-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>BUILDER</th>
                <th className="num-col">SCORE</th>
                <th className="num-col">STREAK</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <MemberRow key={m.handle} member={m} onClick={() => handleMemberClick(m)} />
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'districts' && districtLeagues && (
          <table className="lb-table">
            <thead>
              <tr>
                <th>DISTRICT</th>
                <th className="num-col">BUILDERS</th>
                <th className="num-col">TOTAL XP</th>
                <th>TOP BUILDER</th>
              </tr>
            </thead>
            <tbody>
              {districtLeagues.map(d => (
                <tr key={d.name}>
                  <td><strong style={{ color: 'var(--text)', fontSize: 12 }}>{d.name}</strong></td>
                  <td className="num-col">{d.count}</td>
                  <td className="num-col score-col">{d.score}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{d.topBuilderName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'colleges' && collegeLeagues && (
          <table className="lb-table">
            <thead>
              <tr>
                <th>COLLEGE</th>
                <th className="num-col">STUDENTS</th>
                <th className="num-col">TOTAL XP</th>
                <th>TOP BUILDER</th>
              </tr>
            </thead>
            <tbody>
              {(collegeLeagues.length > 0 ? collegeLeagues : []).map(c => (
                <tr key={c.name}>
                  <td><strong style={{ color: 'var(--text)', fontSize: 12 }}>{c.name}</strong></td>
                  <td className="num-col">{c.count}</td>
                  <td className="num-col score-col">{c.score}</td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{c.topBuilderName || '—'}</td>
                </tr>
              ))}
              {collegeLeagues.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No college data yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
