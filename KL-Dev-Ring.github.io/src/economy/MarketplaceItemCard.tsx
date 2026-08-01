// ── KL DevVerse — Marketplace Item Card ──────────────────────────────
// Individual marketplace item card with rarity border, price, hover effects.
// Memoized for virtual scrolling performance.

import React, { memo, useState, useCallback } from 'react';
import { RARITY_DISPLAY, CURRENCY_DISPLAY, type MarketplaceItem } from '@/economy/economyTypes';

interface Props {
  readonly item: MarketplaceItem;
  readonly owned: boolean;
  readonly onSelect: (item: MarketplaceItem) => void;
}

const MarketplaceItemCard: React.FC<Props> = memo(({ item, owned, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const rarity = RARITY_DISPLAY[item.rarity];
  const currency = CURRENCY_DISPLAY[item.currency];

  const handleClick = useCallback(() => onSelect(item), [item, onSelect]);

  // Category icon mapping
  const getCategoryIcon = (cat: string): string => {
    const icons: Record<string, string> = {
      FURNITURE: '🪑', DECORATION: '🎨', COSMETIC: '👕',
      SPECIAL: '⭐', COLLECTIBLE: '🏅',
    };
    return icons[cat] ?? '📦';
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        padding: '14px',
        borderRadius: '12px',
        background: hovered ? 'rgba(30, 30, 50, 0.95)' : 'rgba(20, 20, 35, 0.9)',
        border: `1.5px solid ${rarity.borderColor}`,
        boxShadow: hovered ? rarity.glow : 'none',
        cursor: 'pointer',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-2px) scale(1.02)' : 'none',
        fontFamily: "'Inter', sans-serif",
        overflow: 'hidden',
      }}
    >
      {/* Rarity Glow Line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: `linear-gradient(90deg, transparent, ${rarity.color}, transparent)`,
        opacity: hovered ? 1 : 0.5,
        transition: 'opacity 0.25s',
      }} />

      {/* Category Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '24px' }}>{getCategoryIcon(item.category)}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#e5e7eb',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {item.name}
          </div>
          <div style={{ fontSize: '10px', color: rarity.color, fontWeight: 500, marginTop: '2px' }}>
            {rarity.label}
          </div>
        </div>
      </div>

      {/* Tags */}
      {item.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} style={{
              fontSize: '9px',
              padding: '1px 6px',
              borderRadius: '6px',
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#9ca3af',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Price + Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '14px',
          fontWeight: 700,
          color: currency.color,
        }}>
          <span>{currency.icon}</span>
          <span>{item.price.toLocaleString()}</span>
          <span style={{ fontSize: '10px', opacity: 0.7 }}>{currency.symbol}</span>
        </div>

        {/* Status Badges */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {owned && (
            <span style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              fontWeight: 600,
            }}>
              OWNED
            </span>
          )}
          {item.isLimited && (
            <span style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              fontWeight: 600,
            }}>
              LIMITED
            </span>
          )}
          {item.featured && !item.isLimited && (
            <span style={{
              fontSize: '9px',
              padding: '2px 6px',
              borderRadius: '6px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              fontWeight: 600,
            }}>
              ★ FEATURED
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

MarketplaceItemCard.displayName = 'MarketplaceItemCard';
export { MarketplaceItemCard };
