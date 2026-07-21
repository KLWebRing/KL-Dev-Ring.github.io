// ── KL DevVerse — Builder Passport Modal ─────────────────────────────
// Displays a member's full profile card with GitHub stats.

import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import type { Member, GitHubProfile } from '@/shared/types';
import { TAG_HUES } from '@/shared/constants';

function hue(tag: string) { return TAG_HUES[tag] ?? 200; }

const XP_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5000, 7000, 10000];
function xpLevel(score: number): number {
  let lvl = 1;
  for (const t of XP_THRESHOLDS) { if (score >= t) lvl++; }
  return Math.min(lvl, XP_THRESHOLDS.length);
}

const TagPill: React.FC<{ tag: string }> = ({ tag }) => (
  <span style={{
    background: `hsl(${hue(tag)},60%,20%)`,
    color: `hsl(${hue(tag)},80%,70%)`,
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 10,
    fontFamily: 'var(--mono)',
    letterSpacing: '0.04em',
  }}>
    {tag}
  </span>
);

export const PassportModal: React.FC = () => {
  const { closeModal, passportMember } = useUIStore();
  const member = passportMember;

  if (!member) return null;

  const level = xpLevel(member.score);
  const primaryHue = hue(member.tags[0] ?? 'webdev');

  return (
    <div className="modal-panel" style={{ maxWidth: 600 }}>
      <div className="modal-header">
        <span>🪪 BUILDER PASSPORT</span>
        <button className="modal-close" onClick={closeModal} aria-label="Close">×</button>
      </div>

      {/* Header card */}
      <div style={{
        background: `linear-gradient(135deg, hsl(${primaryHue},60%,12%), hsl(${primaryHue+30},50%,8%))`,
        padding: '20px 24px',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Avatar */}
        <img
          src={`https://github.com/${member.github}.png?size=80`}
          alt={member.name}
          width={64}
          height={64}
          style={{ borderRadius: 10, border: `2px solid hsl(${primaryHue},60%,40%)` }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <strong style={{ fontSize: 18, color: 'var(--text)' }}>{member.name}</strong>
            <span style={{
              background: `hsl(${primaryHue},70%,30%)`,
              color: `hsl(${primaryHue},80%,70%)`,
              padding: '2px 7px',
              borderRadius: 4,
              fontSize: 10,
              fontFamily: 'var(--mono)',
              fontWeight: 700,
            }}>
              LVL {level}
            </span>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
            @{member.github} · {member.city}, {member.district}
            {member.college ? ` · ${member.college}` : ''}
          </div>
          <p style={{ fontSize: 12, color: '#a0aec0', lineHeight: 1.6, maxWidth: 400 }}>
            {member.bio}
          </p>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: `hsl(${primaryHue},80%,60%)` }}>
            {member.score}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em' }}>
            XP SCORE
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
            RANK #{member.rank}
          </div>
        </div>
      </div>

      <div className="modal-body" style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {member.tags.map(t => <TagPill key={t} tag={t} />)}
        </div>

        {/* Stats grid */}
        {member.stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'COMMITS', value: member.stats.contributions },
              { label: 'MERGED PRs', value: member.stats.mergedPRs },
              { label: 'STREAK', value: `${member.stats.streak}d` },
              { label: 'PROJECTS', value: member.projects?.length ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--surface2)',
                borderRadius: 6,
                padding: '8px 10px',
                border: '1px solid var(--border)',
              }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                  {value}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', letterSpacing: '0.1em', marginTop: 2 }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {member.projects && member.projects.length > 0 && (
          <div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
              PROJECTS
            </p>
            {member.projects.map(proj => (
              <a
                key={proj.url}
                href={proj.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'block',
                  background: 'var(--surface2)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  marginBottom: 6,
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `hsl(${primaryHue},60%,40%)`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                  {proj.name} ↗
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {proj.description}
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Links */}
        <div style={{ display: 'flex', gap: 8 }}>
          <a
            href={member.site}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1, textAlign: 'center', padding: '8px 0',
              background: `hsl(${primaryHue},60%,18%)`,
              color: `hsl(${primaryHue},80%,70%)`,
              borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 10,
              fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em',
            }}
          >
            VISIT SITE ↗
          </a>
          <a
            href={`https://github.com/${member.github}`}
            target="_blank"
            rel="noreferrer"
            style={{
              flex: 1, textAlign: 'center', padding: '8px 0',
              background: 'var(--surface2)', color: 'var(--text)',
              borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 10,
              fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em',
            }}
          >
            GITHUB ↗
          </a>
        </div>
      </div>
    </div>
  );
};
