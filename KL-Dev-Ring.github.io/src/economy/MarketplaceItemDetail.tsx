// ── KL DevVerse — Marketplace Item Detail ────────────────────────────
// Full item detail modal: description, stats, purchase button.
// Shows rarity glow, preview area, tier requirements.

import React, { useCallback } from 'react';
import {
  RARITY_DISPLAY, CURRENCY_DISPLAY, STUDIO_TIERS,
  type MarketplaceItem,
} from '@/economy/economyTypes';
import { useEconomyStore } from '@/stores/economyStore';

interface Props {
  readonly item: MarketplaceItem;
  readonly owned: boolean;
  readonly onClose: () => void;
  readonly onPurchase: (item: MarketplaceItem) => void;
}

export const MarketplaceItemDetail: React.FC<Props> = ({ item, owned, onClose, onPurchase }) => {
  const wallet = useEconomyStore(s => s.wallet);
  const rarity = RARITY_DISPLAY[item.rarity];
  const currency = CURRENCY_DISPLAY[item.currency];

  const canAfford = wallet ? wallet.builderCash >= item.price : false;
  const tierDef = STUDIO_TIERS.find(t => t.tier === item.requiredTier);

  const handlePurchase = useCallback(() => {
    if (!owned && canAfford) {
      onPurchase(item);
    }
  }, [owned, canAfford, item, onPurchase]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '420px',
          maxHeight: '85vh',
          overflow: 'auto',
          borderRadius: '16px',
          background: 'rgba(18, 18, 32, 0.98)',
          border: `1.5px solid ${rarity.borderColor}`,
          boxShadow: `${rarity.glow}, 0 20px 60px rgba(0,0,0,0.5)`,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Header Glow Bar */}
        <div style={{
          height: '3px',
          background: `linear-gradient(90deg, transparent, ${rarity.color}, transparent)`,
        }} />

        {/* Preview Area */}
        <div style={{
          height: '180px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: rarity.bgColor,
          borderBottom: `1px solid ${rarity.borderColor}`,
          position: 'relative',
        }}>
          <span style={{ fontSize: '64px' }}>
            {getCategoryPreview(item.category)}
          </span>

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.4)',
              color: '#9ca3af',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>

          {/* Rarity Badge */}
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '14px',
            padding: '3px 10px',
            borderRadius: '8px',
            background: rarity.bgColor,
            border: `1px solid ${rarity.borderColor}`,
            color: rarity.color,
            fontSize: '11px',
            fontWeight: 600,
          }}>
            {rarity.label}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Name */}
          <h3 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#f3f4f6',
            margin: '0 0 6px 0',
          }}>
            {item.name}
          </h3>

          {/* Description */}
          <p style={{
            fontSize: '13px',
            color: '#9ca3af',
            margin: '0 0 16px 0',
            lineHeight: 1.5,
          }}>
            {item.description || 'A unique item for your builder studio.'}
          </p>

          {/* Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '16px',
          }}>
            <StatBox label="Category" value={item.category} />
            <StatBox label="Required Tier" value={tierDef?.name ?? `Tier ${item.requiredTier}`} />
            {item.isLimited && (
              <StatBox label="Stock" value={item.stock !== null ? `${item.stock} left` : 'Limited'} highlight />
            )}
            {item.tags.length > 0 && (
              <StatBox label="Tags" value={item.tags.join(', ')} />
            )}
          </div>

          {/* Price + Purchase */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            {/* Price */}
            <div>
              <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '2px' }}>Price</div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: currency.color,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span>{currency.icon}</span>
                <span>{item.price.toLocaleString()}</span>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>{currency.symbol}</span>
              </div>
            </div>

            {/* Purchase Button */}
            <button
              onClick={handlePurchase}
              disabled={owned || !canAfford}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: owned || !canAfford ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                ...(owned ? {
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e',
                } : canAfford ? {
                  background: `linear-gradient(135deg, ${currency.color}, ${currency.color}cc)`,
                  color: '#000',
                  boxShadow: `0 4px 16px ${currency.color}40`,
                } : {
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#6b7280',
                }),
              }}
            >
              {owned ? '✓ Owned' : canAfford ? 'Purchase' : 'Insufficient Funds'}
            </button>
          </div>

          {/* Balance Info */}
          {!owned && wallet && (
            <div style={{
              marginTop: '8px',
              fontSize: '11px',
              color: canAfford ? '#6b7280' : '#ef4444',
              textAlign: 'right',
            }}>
              Your balance: {currency.icon} {wallet.builderCash.toLocaleString()} {currency.symbol}
              {!canAfford && ` (need ${(item.price - wallet.builderCash).toLocaleString()} more)`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Stat Box ────────────────────────────────────────────────────────

const StatBox: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{
    padding: '8px 10px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: `1px solid ${highlight ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
  }}>
    <div style={{ fontSize: '9px', color: '#6b7280', marginBottom: '2px', textTransform: 'uppercase' }}>
      {label}
    </div>
    <div style={{
      fontSize: '12px',
      color: highlight ? '#ef4444' : '#d1d5db',
      fontWeight: 500,
    }}>
      {value}
    </div>
  </div>
);

// ── Helpers ─────────────────────────────────────────────────────────

function getCategoryPreview(category: string): string {
  const previews: Record<string, string> = {
    FURNITURE: '🪑', DECORATION: '🖼️', COSMETIC: '👔',
    SPECIAL: '✨', COLLECTIBLE: '🏆',
  };
  return previews[category] ?? '📦';
}
