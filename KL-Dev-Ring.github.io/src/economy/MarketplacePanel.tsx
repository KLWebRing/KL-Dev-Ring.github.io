// ── KL DevVerse — Marketplace Panel ──────────────────────────────────
// Full marketplace UI: category sidebar, search, filters, item grid.
// Opens as a full-screen overlay from the game UI.

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MarketplaceItemCard } from './MarketplaceItemCard';
import { MarketplaceItemDetail } from './MarketplaceItemDetail';
import type { MarketplaceItem, ItemRarity } from '@/economy/economyTypes';
import { RARITY_DISPLAY, CURRENCY_DISPLAY } from '@/economy/economyTypes';

// ── API Fetch ───────────────────────────────────────────────────────

const API_BASE = '/api/economy/marketplace';

async function fetchAPI<T>(path: string): Promise<T> {
  const token = localStorage.getItem('kldevverse_access_token');
  const res = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ── Category Config ─────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'ALL', label: 'All Items', icon: '🏪' },
  { id: 'FURNITURE', label: 'Furniture', icon: '🪑' },
  { id: 'DECORATION', label: 'Decorations', icon: '🎨' },
  { id: 'COSMETIC', label: 'Clothing', icon: '👕' },
  { id: 'SPECIAL', label: 'Special', icon: '⭐' },
  { id: 'COLLECTIBLE', label: 'Collectibles', icon: '🏅' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'name', label: 'Name: A → Z' },
];

// ── Props ───────────────────────────────────────────────────────────

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

// ── Component ───────────────────────────────────────────────────────

export const MarketplacePanel: React.FC<Props> = ({ isOpen, onClose }) => {
  // State
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedRarity, setSelectedRarity] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [ownedItems] = useState<Set<string>>(new Set()); // TODO: wire to inventory

  // ── Fetch Items ─────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      params.set('sortBy', sortBy);
      if (selectedCategory !== 'ALL') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);
      if (selectedRarity) params.set('rarity', selectedRarity);

      const data = await fetchAPI<{
        items: MarketplaceItem[];
        pagination: { page: number; totalPages: number };
      }>(`${API_BASE}?${params}`);

      setItems(data.items);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('[Marketplace] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, selectedCategory, searchQuery, selectedRarity]);

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen, fetchItems]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchQuery, sortBy, selectedRarity]);

  const handleSelectItem = useCallback((item: MarketplaceItem) => {
    setSelectedItem(item);
  }, []);

  const handlePurchase = useCallback((_item: MarketplaceItem) => {
    // TODO: Wire to purchase flow (Subsystem 5)
    setSelectedItem(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 400,
      display: 'flex',
      background: 'rgba(5, 5, 15, 0.95)',
      backdropFilter: 'blur(12px)',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <div style={{
        width: '220px',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {/* Title */}
        <div style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#f3f4f6',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>🏪</span>
          <span>Marketplace</span>
        </div>

        {/* Categories */}
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '8px',
              border: 'none',
              background: selectedCategory === cat.id
                ? 'rgba(96, 165, 250, 0.12)'
                : 'transparent',
              color: selectedCategory === cat.id ? '#60a5fa' : '#9ca3af',
              fontSize: '13px',
              fontWeight: selectedCategory === cat.id ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}

        {/* Rarity Filter */}
        <div style={{
          marginTop: '16px',
          fontSize: '10px',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          padding: '0 12px',
        }}>
          Rarity
        </div>

        {(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as ItemRarity[]).map(r => {
          const rd = RARITY_DISPLAY[r];
          return (
            <button
              key={r}
              onClick={() => setSelectedRarity(selectedRarity === r ? null : r)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedRarity === r ? rd.bgColor : 'transparent',
                color: selectedRarity === r ? rd.color : '#6b7280',
                fontSize: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: rd.color,
                opacity: selectedRarity === r ? 1 : 0.4,
              }} />
              <span>{rd.label}</span>
            </button>
          );
        })}

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            marginTop: 'auto',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(255, 255, 255, 0.03)',
            color: '#9ca3af',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ← Back to World
        </button>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search + Sort Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          {/* Search */}
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px 8px 36px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#e5e7eb',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                outline: 'none',
              }}
            />
            <span style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '14px',
              opacity: 0.5,
            }}>
              🔍
            </span>
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#e5e7eb',
              fontSize: '12px',
              fontFamily: "'Inter', sans-serif",
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Item count */}
          <span style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>
            Page {page} of {totalPages}
          </span>
        </div>

        {/* Item Grid */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px 20px',
        }}>
          {loading ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#6b7280',
              fontSize: '14px',
            }}>
              Loading marketplace...
            </div>
          ) : items.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#6b7280',
            }}>
              <span style={{ fontSize: '40px', marginBottom: '12px' }}>🏪</span>
              <span style={{ fontSize: '14px' }}>No items found</span>
              <span style={{ fontSize: '12px', opacity: 0.6 }}>Try adjusting your filters</span>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '12px',
            }}>
              {items.map(item => (
                <MarketplaceItemCard
                  key={item.id}
                  item={item}
                  owned={ownedItems.has(item.catalogId)}
                  onSelect={handleSelectItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            <PaginationButton
              label="← Prev"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            />
            <span style={{ fontSize: '12px', color: '#6b7280', padding: '0 12px' }}>
              {page} / {totalPages}
            </span>
            <PaginationButton
              label="Next →"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            />
          </div>
        )}
      </div>

      {/* ── Item Detail Modal ──────────────────────────────────── */}
      {selectedItem && (
        <MarketplaceItemDetail
          item={selectedItem}
          owned={ownedItems.has(selectedItem.catalogId)}
          onClose={() => setSelectedItem(null)}
          onPurchase={handlePurchase}
        />
      )}
    </div>
  );
};

// ── Pagination Button ───────────────────────────────────────────────

const PaginationButton: React.FC<{
  label: string;
  disabled: boolean;
  onClick: () => void;
}> = ({ label, disabled, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: '6px 14px',
      borderRadius: '6px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      background: disabled ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
      color: disabled ? '#4b5563' : '#d1d5db',
      fontSize: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: "'Inter', sans-serif",
    }}
  >
    {label}
  </button>
);
