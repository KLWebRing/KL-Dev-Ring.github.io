// ── KL DevVerse — Studio Upgrade Panel ───────────────────────────────
// Shows current tier, next tier preview, requirements, upgrade button.
// Animated tier comparison with unlock details.

import React, { useState, useEffect, useCallback } from 'react';
import { STUDIO_TIERS, CURRENCY_DISPLAY } from '@/economy/economyTypes';
import { useEconomyStore } from '@/stores/economyStore';

interface UpgradeInfo {
  currentTier: number;
  currentTierName: string;
  nextTier: number | null;
  nextTierName: string | null;
  nextTierInfo: typeof STUDIO_TIERS[number] | null;
  upgradeCost: number | null;
  canAfford: boolean;
  isMaxTier: boolean;
}

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

const TIER_ICONS = ['🏠', '🏢', '🔬', '🚀', '🏫', '🏛️'];
const TIER_COLORS = ['#9ca3af', '#60a5fa', '#a78bfa', '#f59e0b', '#ec4899', '#ef4444'];

export const StudioUpgradePanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [info, setInfo] = useState<UpgradeInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [result, setResult] = useState<{ tierName: string; newTier: number } | null>(null);
  const { fetchWallet } = useEconomyStore();
  const cashDisplay = CURRENCY_DISPLAY.BUILDER_CASH;

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('kldevverse_access_token');
      const res = await fetch('/api/economy/studio-upgrade', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) setInfo(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) { fetchInfo(); setResult(null); }
  }, [isOpen, fetchInfo]);

  const handleUpgrade = useCallback(async () => {
    setUpgrading(true);
    try {
      const token = localStorage.getItem('kldevverse_access_token');
      const res = await fetch('/api/economy/studio-upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Upgrade failed');
      }
      const data = await res.json();
      setResult({ tierName: data.tierName, newTier: data.newTier });
      await fetchWallet();
      await fetchInfo();
    } catch (err) {
      console.error('[StudioUpgrade]', err);
    }
    setUpgrading(false);
  }, [fetchWallet, fetchInfo]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '480px', maxHeight: '85vh', overflow: 'auto',
          borderRadius: '16px', background: 'rgba(18,18,32,0.98)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', margin: 0 }}>
              🏗️ Studio Upgrade
            </h2>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Expand your builder workspace
            </p>
          </div>
          <button onClick={onClose} style={{
            width: '28px', height: '28px', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(0,0,0,0.3)', color: '#9ca3af',
            fontSize: '14px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {loading || !info ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Loading...
            </div>
          ) : result ? (
            /* Success State */
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>🎉</div>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#22c55e', margin: '0 0 8px' }}>
                Upgrade Complete!
              </h3>
              <p style={{ fontSize: '14px', color: '#d1d5db', margin: 0 }}>
                Welcome to your <strong>{result.tierName}</strong>
              </p>
              <div style={{
                marginTop: '16px', fontSize: '48px',
              }}>
                {TIER_ICONS[result.newTier - 1] ?? '🏢'}
              </div>
            </div>
          ) : (
            <>
              {/* Tier Progression */}
              <div style={{
                display: 'flex', gap: '8px', marginBottom: '24px',
                justifyContent: 'center',
              }}>
                {STUDIO_TIERS.map((tier, i) => (
                  <div key={tier.tier} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px',
                      background: tier.tier <= info.currentTier
                        ? `${TIER_COLORS[i]}20`
                        : 'rgba(255,255,255,0.03)',
                      border: tier.tier === info.currentTier
                        ? `2px solid ${TIER_COLORS[i]}`
                        : '1px solid rgba(255,255,255,0.06)',
                      opacity: tier.tier <= info.currentTier ? 1 : 0.4,
                    }}>
                      {TIER_ICONS[i]}
                    </div>
                    <span style={{
                      fontSize: '8px',
                      color: tier.tier === info.currentTier ? TIER_COLORS[i] : '#4b5563',
                      fontWeight: tier.tier === info.currentTier ? 600 : 400,
                    }}>
                      T{tier.tier}
                    </span>
                  </div>
                ))}
              </div>

              {/* Current Tier */}
              <div style={{
                padding: '16px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${TIER_COLORS[info.currentTier - 1]}30`,
                marginBottom: '12px',
              }}>
                <div style={{
                  fontSize: '11px', color: '#6b7280', textTransform: 'uppercase',
                  marginBottom: '4px',
                }}>
                  Current Tier
                </div>
                <div style={{
                  fontSize: '16px', fontWeight: 600,
                  color: TIER_COLORS[info.currentTier - 1],
                }}>
                  {TIER_ICONS[info.currentTier - 1]} {info.currentTierName}
                </div>
              </div>

              {/* Next Tier */}
              {!info.isMaxTier && info.nextTierInfo && info.nextTier && (
                <>
                  <div style={{ textAlign: 'center', color: '#4b5563', margin: '8px 0' }}>↓</div>

                  <div style={{
                    padding: '16px', borderRadius: '10px',
                    background: `${TIER_COLORS[info.nextTier - 1]}08`,
                    border: `1px solid ${TIER_COLORS[info.nextTier - 1]}30`,
                    marginBottom: '16px',
                  }}>
                    <div style={{
                      fontSize: '11px', color: '#6b7280', textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}>
                      Next Tier
                    </div>
                    <div style={{
                      fontSize: '16px', fontWeight: 600,
                      color: TIER_COLORS[info.nextTier - 1],
                      marginBottom: '10px',
                    }}>
                      {TIER_ICONS[info.nextTier - 1]} {info.nextTierName}
                    </div>

                    {/* Unlock Grid */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      gap: '8px', fontSize: '12px',
                    }}>
                      <UnlockStat label="Rooms" value={`${info.nextTierInfo.rooms}`} />
                      <UnlockStat label="Furniture Slots" value={`${info.nextTierInfo.furnitureSlots}`} />
                      <UnlockStat label="Project Slots" value={`${info.nextTierInfo.projectSlots}`} />
                      <UnlockStat label="Max Visitors" value={`${info.nextTierInfo.maxVisitors}`} />
                    </div>
                  </div>

                  {/* Upgrade Button */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>Upgrade Cost</div>
                      <div style={{
                        fontSize: '18px', fontWeight: 700, color: cashDisplay.color,
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        {cashDisplay.icon} {info.upgradeCost?.toLocaleString()} {cashDisplay.symbol}
                      </div>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      disabled={!info.canAfford || upgrading}
                      style={{
                        padding: '10px 24px', borderRadius: '10px',
                        border: 'none', fontWeight: 600, fontSize: '13px',
                        cursor: info.canAfford && !upgrading ? 'pointer' : 'not-allowed',
                        fontFamily: "'Inter', sans-serif",
                        ...(info.canAfford ? {
                          background: `linear-gradient(135deg, ${TIER_COLORS[info.nextTier - 1]}, ${TIER_COLORS[info.nextTier - 1]}cc)`,
                          color: '#fff',
                          boxShadow: `0 4px 16px ${TIER_COLORS[info.nextTier - 1]}40`,
                        } : {
                          background: 'rgba(255,255,255,0.05)',
                          color: '#6b7280',
                        }),
                      }}
                    >
                      {upgrading ? 'Upgrading...' : info.canAfford ? 'Upgrade Studio' : 'Insufficient Funds'}
                    </button>
                  </div>
                </>
              )}

              {info.isMaxTier && (
                <div style={{
                  textAlign: 'center', padding: '20px',
                  color: '#fbbf24', fontSize: '14px',
                }}>
                  🏆 Maximum tier reached — Your studio is legendary!
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const UnlockStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    padding: '6px 8px', borderRadius: '6px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.04)',
  }}>
    <div style={{ fontSize: '9px', color: '#6b7280', textTransform: 'uppercase' }}>{label}</div>
    <div style={{ fontSize: '13px', color: '#d1d5db', fontWeight: 600 }}>{value}</div>
  </div>
);
