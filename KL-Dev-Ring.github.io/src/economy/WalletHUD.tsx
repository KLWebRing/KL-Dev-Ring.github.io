// ── KL DevVerse — Wallet HUD ─────────────────────────────────────────
// Compact overlay showing Builder Cash, XP, Reputation, Innovation Score.
// Animated balance updates with count-up and glow effects.
// Click to expand for full wallet details.

import React, { useEffect, useState, useCallback } from 'react';
import { useEconomyStore } from '@/stores/economyStore';
import { CURRENCY_DISPLAY, type CurrencyType } from '@/economy/economyTypes';

// ── Styles ──────────────────────────────────────────────────────────

const styles = {
  container: {
    position: 'fixed' as const,
    top: '12px',
    right: '12px',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    pointerEvents: 'auto' as const,
    userSelect: 'none' as const,
  },
  pill: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '20px',
    background: 'rgba(15, 15, 25, 0.85)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '13px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 600,
    color: '#e5e7eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    minWidth: '100px',
  },
  pillHover: {
    background: 'rgba(25, 25, 40, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
  },
  icon: {
    fontSize: '14px',
  },
  amount: {
    flex: 1,
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const,
  },
  symbol: {
    fontSize: '10px',
    opacity: 0.6,
    marginLeft: '2px',
  },
  // Animation overlay for balance changes
  animOverlay: {
    position: 'fixed' as const,
    top: '50px',
    right: '20px',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    pointerEvents: 'none' as const,
  },
  animPill: {
    padding: '6px 16px',
    borderRadius: '16px',
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    animation: 'walletFadeUp 2.5s ease-out forwards',
    whiteSpace: 'nowrap' as const,
  },
  // Streak indicator
  streak: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.2)',
    fontSize: '11px',
    color: '#fbbf24',
    cursor: 'pointer',
  },
};

// ── CSS Animation (injected once) ───────────────────────────────────

const KEYFRAMES_ID = 'walletHudKeyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes walletFadeUp {
      0% { opacity: 1; transform: translateY(0); }
      70% { opacity: 1; transform: translateY(-20px); }
      100% { opacity: 0; transform: translateY(-40px); }
    }
    @keyframes walletGlow {
      0% { box-shadow: none; }
      50% { box-shadow: 0 0 12px var(--glow-color, rgba(251, 191, 36, 0.5)); }
      100% { box-shadow: none; }
    }
  `;
  document.head.appendChild(style);
}

// ── Component ───────────────────────────────────────────────────────

const DISPLAYED_CURRENCIES: CurrencyType[] = [
  'BUILDER_CASH',
  'XP',
  'REPUTATION',
  'INNOVATION',
];

export const WalletHUD: React.FC = () => {
  const { wallet, pendingAnimations, fetchWallet, claimDailyReward, dailyClaimLoading } =
    useEconomyStore();

  const [hoveredPill, setHoveredPill] = useState<string | null>(null);
  const [glowingCurrency, setGlowingCurrency] = useState<string | null>(null);

  useEffect(() => {
    injectKeyframes();
    fetchWallet();
  }, [fetchWallet]);

  // Glow effect when animation fires
  useEffect(() => {
    if (pendingAnimations.length > 0) {
      const latest = pendingAnimations[pendingAnimations.length - 1];
      if (latest) {
        setGlowingCurrency(latest.currency);
        const timer = setTimeout(() => setGlowingCurrency(null), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [pendingAnimations]);

  const handleClaimDaily = useCallback(() => {
    if (!dailyClaimLoading) {
      claimDailyReward();
    }
  }, [dailyClaimLoading, claimDailyReward]);

  if (!wallet) return null;

  const getBalance = (currency: CurrencyType): number => {
    switch (currency) {
      case 'BUILDER_CASH': return wallet.builderCash;
      case 'XP': return wallet.totalXp;
      case 'REPUTATION': return wallet.reputation;
      case 'INNOVATION': return wallet.innovationScore;
      case 'SEASON_TOKEN': return wallet.seasonTokens;
    }
  };

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <>
      {/* Currency Pills */}
      <div style={styles.container}>
        {DISPLAYED_CURRENCIES.map((currency) => {
          const display = CURRENCY_DISPLAY[currency];
          const balance = getBalance(currency);
          const isHovered = hoveredPill === currency;
          const isGlowing = glowingCurrency === currency;

          return (
            <div
              key={currency}
              style={{
                ...styles.pill,
                ...(isHovered ? styles.pillHover : {}),
                ...(isGlowing ? {
                  animation: 'walletGlow 1s ease-in-out',
                  ['--glow-color' as string]: display.color + '80',
                } : {}),
              }}
              onMouseEnter={() => setHoveredPill(currency)}
              onMouseLeave={() => setHoveredPill(null)}
            >
              <span style={styles.icon}>{display.icon}</span>
              <span style={{ ...styles.amount, color: display.color }}>
                {formatNumber(balance)}
              </span>
              <span style={styles.symbol}>{display.symbol}</span>
            </div>
          );
        })}

        {/* Level indicator */}
        <div
          style={{
            ...styles.pill,
            background: 'rgba(96, 165, 250, 0.08)',
            border: '1px solid rgba(96, 165, 250, 0.2)',
          }}
        >
          <span style={styles.icon}>🎯</span>
          <span style={{ ...styles.amount, color: '#60a5fa' }}>
            Lv. {wallet.level}
          </span>
        </div>

        {/* Daily reward streak */}
        <div
          style={styles.streak}
          onClick={handleClaimDaily}
          title={dailyClaimLoading ? 'Claiming...' : 'Claim daily reward'}
        >
          <span>🔥</span>
          <span>{wallet.dailyLoginStreak} day streak</span>
        </div>
      </div>

      {/* Balance Change Animations */}
      <div style={styles.animOverlay}>
        {pendingAnimations.map((anim) => {
          const display = CURRENCY_DISPLAY[anim.currency as CurrencyType];
          if (!display) return null;
          return (
            <div
              key={anim.id}
              style={{
                ...styles.animPill,
                color: display.color,
                background: display.color + '15',
                border: `1px solid ${display.color}30`,
              }}
            >
              {anim.amount > 0 ? '+' : ''}{formatNumber(anim.amount)} {display.symbol}
            </div>
          );
        })}
      </div>
    </>
  );
};
