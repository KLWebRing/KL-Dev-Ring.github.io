// ── KL DevVerse — Project Portal Panel ───────────────────────────────
// Shows project portals with tech stack, version history, and live preview.

import React, { useState, useEffect, useCallback } from 'react';

interface PortalSummary {
  displayId: string;
  repoName: string;
  repoUrl: string;
  description: string;
  slotIndex: number;
  hasPortal: boolean;
  portal: {
    id: string;
    techStack: string[];
    stars: number;
    forks: number;
    livePreviewUrl: string | null;
    latestVersion: string | null;
  } | null;
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const TECH_COLORS: Record<string, string> = {
  'React': '#61dafb', 'TypeScript': '#3178c6', 'JavaScript': '#f7df1e',
  'Python': '#3776ab', 'Rust': '#ce422b', 'Go': '#00add8',
  'Next.js': '#fff', 'Node.js': '#339933', 'NestJS': '#e0234e',
  'PostgreSQL': '#4169e1', 'Redis': '#dc382d', 'Docker': '#2496ed',
  'Three.js': '#049ef4', 'TailwindCSS': '#06b6d4', 'Prisma': '#2d3748',
};

export const ProjectPortal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('kldevverse_access_token');
    const h: Record<string, string> = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch('/api/ecosystem/portals', { headers: getHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => setPortals(d))
      .catch(err => console.error('[ProjectPortal]', err))
      .finally(() => setLoading(false));
  }, [isOpen, getHeaders]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(5, 5, 15, 0.92)', backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: 'rgba(18, 18, 32, 0.98)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px', width: '700px', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(88,28,135,0.2), transparent)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#fff', fontWeight: 700 }}>🌀 Project Portals</h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af', fontSize: '13px' }}>
              Your projects as interactive worlds
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            color: '#9ca3af', width: '32px', height: '32px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '14px',
          }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Loading portals...</div>
          ) : portals.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4b5563', padding: '60px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌀</div>
              <p style={{ margin: 0, fontSize: '14px' }}>No projects on your wall yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>
                Add projects to your studio wall to create portals!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {portals.map(p => (
                <div key={p.displayId} style={{
                  padding: '16px 20px', borderRadius: '12px',
                  background: p.hasPortal ? 'rgba(167,139,250,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${p.hasPortal ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)'}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '16px' }}>🌀</span>
                        <a href={p.repoUrl} target="_blank" rel="noreferrer" style={{
                          fontSize: '15px', fontWeight: 600, color: '#e5e7eb',
                          textDecoration: 'none',
                        }}>
                          {p.repoName}
                        </a>
                        {p.portal?.latestVersion && (
                          <span style={{
                            fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                            background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
                          }}>
                            {p.portal.latestVersion}
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{p.description}</p>
                    </div>

                    {p.portal && (
                      <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#6b7280' }}>
                        <span>⭐ {p.portal.stars}</span>
                        <span>🍴 {p.portal.forks}</span>
                      </div>
                    )}
                  </div>

                  {/* Tech Stack */}
                  {p.portal && p.portal.techStack.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {p.portal.techStack.map(tech => (
                        <span key={tech} style={{
                          padding: '2px 8px', borderRadius: '4px', fontSize: '10px',
                          background: `${TECH_COLORS[tech] ?? '#9ca3af'}15`,
                          color: TECH_COLORS[tech] ?? '#9ca3af',
                          border: `1px solid ${TECH_COLORS[tech] ?? '#9ca3af'}25`,
                        }}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Live Preview Link */}
                  {p.portal?.livePreviewUrl && (
                    <a href={p.portal.livePreviewUrl} target="_blank" rel="noreferrer" style={{
                      display: 'inline-block', marginTop: '8px', fontSize: '11px',
                      color: '#34d399', textDecoration: 'none',
                    }}>
                      🔗 Live Preview →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
