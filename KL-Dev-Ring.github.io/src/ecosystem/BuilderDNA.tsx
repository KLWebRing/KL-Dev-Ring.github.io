// ── KL DevVerse — Builder DNA Panel ──────────────────────────────────
// Shows the builder's DNA type, color palette, equipment, and all profiles.

import React, { useState, useEffect, useCallback } from 'react';

interface DNAProfile {
  type: string;
  label: string;
  description: string;
  colorPalette: { primary: string; secondary: string; accent: string; glow: string };
}

interface DNAState {
  primaryType: string;
  primaryLabel: string;
  primaryDescription: string;
  secondaryType: string | null;
  secondaryLabel: string | null;
  colorPalette: { primary: string; secondary: string; accent: string; glow: string };
  equipment: string[];
  ambientPreset: string;
  allProfiles: DNAProfile[];
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export const BuilderDNA: React.FC<Props> = ({ isOpen, onClose }) => {
  const [dna, setDNA] = useState<DNAState | null>(null);
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
    fetch('/api/ecosystem/dna', { headers: getHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setDNA(d); })
      .catch(err => console.error('[BuilderDNA]', err))
      .finally(() => setLoading(false));
  }, [isOpen, getHeaders]);

  if (!isOpen) return null;

  const palette = dna?.colorPalette ?? { primary: '#60a5fa', secondary: '#1e3a5f', accent: '#bfdbfe', glow: '#3b82f6' };

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
          background: `linear-gradient(135deg, ${palette.secondary}, rgba(18,18,32,0.9))`,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#fff', fontWeight: 700 }}>🧬 Builder DNA</h2>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              Your unique developer identity
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', width: '32px', height: '32px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '14px',
          }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {loading || !dna ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Analyzing DNA...</div>
          ) : (
            <>
              {/* Primary DNA Card */}
              <div style={{
                textAlign: 'center', padding: '28px', marginBottom: '20px',
                background: `linear-gradient(135deg, ${palette.secondary}, ${palette.primary}15)`,
                border: `1px solid ${palette.primary}30`,
                borderRadius: '14px', position: 'relative', overflow: 'hidden',
              }}>
                {/* Glow effect */}
                <div style={{
                  position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
                  width: '200px', height: '200px', borderRadius: '50%',
                  background: `radial-gradient(circle, ${palette.glow}20, transparent 70%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{ fontSize: '11px', color: palette.primary, textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 700, position: 'relative' }}>
                  Primary DNA Type
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', margin: '8px 0', position: 'relative' }}>
                  {dna.primaryLabel}
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)', position: 'relative' }}>
                  {dna.primaryDescription}
                </p>
                {dna.secondaryLabel && (
                  <div style={{ marginTop: '12px', fontSize: '12px', color: palette.accent, position: 'relative' }}>
                    Secondary: {dna.secondaryLabel}
                  </div>
                )}
              </div>

              {/* Color Palette Preview */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', color: '#e5e7eb', margin: '0 0 8px', fontWeight: 600 }}>🎨 Studio Palette</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Object.entries(palette).map(([key, color]) => (
                    <div key={key} style={{
                      flex: 1, padding: '12px 8px', borderRadius: '8px', textAlign: 'center',
                      background: color, border: '1px solid rgba(255,255,255,0.1)',
                    }}>
                      <span style={{ fontSize: '10px', fontWeight: 600, color: key === 'secondary' ? '#fff' : '#000', textTransform: 'capitalize' }}>
                        {key}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Equipment */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '14px', color: '#e5e7eb', margin: '0 0 8px', fontWeight: 600 }}>
                  ⚙️ DNA Equipment ({dna.equipment.length})
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {dna.equipment.map(item => (
                    <span key={item} style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                      background: `${palette.primary}12`, border: `1px solid ${palette.primary}25`,
                      color: palette.primary,
                    }}>
                      {item.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* All Profiles Grid */}
              <div>
                <h3 style={{ fontSize: '14px', color: '#e5e7eb', margin: '0 0 12px', fontWeight: 600 }}>📋 All DNA Types</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {dna.allProfiles.map(profile => {
                    const isActive = profile.type === dna.primaryType;
                    return (
                      <div key={profile.type} style={{
                        padding: '10px 12px', borderRadius: '8px',
                        background: isActive ? `${profile.colorPalette.primary}15` : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isActive ? `${profile.colorPalette.primary}40` : 'rgba(255,255,255,0.04)'}`,
                        opacity: isActive ? 1 : 0.6,
                      }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px',
                        }}>
                          <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: profile.colorPalette.primary,
                          }} />
                          <span style={{ fontSize: '12px', fontWeight: 600, color: isActive ? '#fff' : '#9ca3af' }}>
                            {profile.label}
                          </span>
                          {isActive && <span style={{ fontSize: '10px', color: profile.colorPalette.primary }}>● Active</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
