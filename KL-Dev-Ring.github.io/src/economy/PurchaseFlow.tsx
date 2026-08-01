// ── KL DevVerse — Purchase Flow ──────────────────────────────────────
// Animated purchase flow: Confirm → Processing → Result.
// Handles API call, wallet refresh, and notification.

import React, { useState, useCallback } from 'react';
import type { MarketplaceItem } from '@/economy/economyTypes';
import { RARITY_DISPLAY, CURRENCY_DISPLAY } from '@/economy/economyTypes';
import { useEconomyStore } from '@/stores/economyStore';

type FlowState = 'confirm' | 'processing' | 'success' | 'error';

interface Props {
  readonly item: MarketplaceItem;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
}

// ── CSS Animation (injected once) ───────────────────────────────────

const KEYFRAMES_ID = 'purchaseFlowKeyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes purchaseSparkle {
      0% { transform: scale(0.8) rotate(0deg); opacity: 0; }
      50% { transform: scale(1.2) rotate(180deg); opacity: 1; }
      100% { transform: scale(1) rotate(360deg); opacity: 1; }
    }
    @keyframes purchasePulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes purchaseSlideUp {
      0% { transform: translateY(20px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes coinDrop {
      0% { transform: translateY(-30px); opacity: 0; }
      60% { transform: translateY(5px); opacity: 1; }
      100% { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export const PurchaseFlow: React.FC<Props> = ({ item, onClose, onSuccess }) => {
  const [state, setState] = useState<FlowState>('confirm');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<{ newBalance: number } | null>(null);

  const { fetchWallet, queueAnimation } = useEconomyStore();
  const rarity = RARITY_DISPLAY[item.rarity];
  const currency = CURRENCY_DISPLAY[item.currency];

  React.useEffect(() => { injectKeyframes(); }, []);

  const handleConfirm = useCallback(async () => {
    setState('processing');

    try {
      const token = localStorage.getItem('kldevverse_access_token');
      const res = await fetch('/api/economy/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ marketplaceItemId: item.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: 'Purchase failed' }));
        throw new Error(body.message);
      }

      const data = await res.json();
      setResult({ newBalance: data.cost.newBalance });
      setState('success');

      // Queue animation + refresh wallet
      queueAnimation(item.currency, -item.price);
      await fetchWallet();

      // Auto-close after success
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Purchase failed');
      setState('error');
    }
  }, [item, fetchWallet, queueAnimation, onSuccess, onClose]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(12px)',
      }}
      onClick={state === 'confirm' || state === 'error' ? onClose : undefined}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '380px',
          borderRadius: '16px',
          background: 'rgba(18, 18, 32, 0.98)',
          border: `1.5px solid ${rarity.borderColor}`,
          boxShadow: `${rarity.glow}, 0 20px 60px rgba(0,0,0,0.5)`,
          fontFamily: "'Inter', sans-serif",
          overflow: 'hidden',
        }}
      >
        {/* Confirm State */}
        {state === 'confirm' && (
          <div style={{ padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px' }}>
                🛒
              </span>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f3f4f6', margin: '0 0 4px 0' }}>
                Confirm Purchase
              </h3>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>
                Are you sure you want to buy this item?
              </p>
            </div>

            {/* Item Preview */}
            <div style={{
              padding: '14px',
              borderRadius: '10px',
              background: rarity.bgColor,
              border: `1px solid ${rarity.borderColor}`,
              marginBottom: '16px',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>
                {item.name}
              </div>
              <div style={{ fontSize: '11px', color: rarity.color, marginTop: '2px' }}>
                {rarity.label}
              </div>
            </div>

            {/* Cost */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              fontSize: '24px',
              fontWeight: 700,
              color: currency.color,
              marginBottom: '20px',
            }}>
              <span>{currency.icon}</span>
              <span>{item.price.toLocaleString()}</span>
              <span style={{ fontSize: '14px', opacity: 0.7 }}>{currency.symbol}</span>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#9ca3af', fontSize: '13px', cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                style={{
                  flex: 1, padding: '10px', borderRadius: '8px',
                  border: 'none',
                  background: `linear-gradient(135deg, ${currency.color}, ${currency.color}cc)`,
                  color: '#000', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {state === 'processing' && (
          <div style={{
            padding: '40px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              animation: 'purchasePulse 1s ease-in-out infinite',
              marginBottom: '16px',
            }}>
              ⏳
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>
              Processing purchase...
            </div>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && (
          <div style={{
            padding: '40px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '56px',
              animation: 'purchaseSparkle 0.8s ease-out forwards',
              marginBottom: '16px',
            }}>
              ✨
            </div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#22c55e',
              margin: '0 0 8px 0',
              animation: 'purchaseSlideUp 0.5s ease-out 0.3s forwards',
              opacity: 0,
            }}>
              Purchase Complete!
            </h3>
            <p style={{
              fontSize: '13px',
              color: '#9ca3af',
              margin: '0 0 16px 0',
              animation: 'purchaseSlideUp 0.5s ease-out 0.5s forwards',
              opacity: 0,
            }}>
              {item.name} has been added to your inventory
            </p>
            {result && (
              <div style={{
                fontSize: '12px',
                color: currency.color,
                animation: 'coinDrop 0.6s ease-out 0.7s forwards',
                opacity: 0,
              }}>
                New balance: {currency.icon} {result.newBalance.toLocaleString()} {currency.symbol}
              </div>
            )}
          </div>
        )}

        {/* Error State */}
        {state === 'error' && (
          <div style={{
            padding: '30px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>❌</div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', margin: '0 0 8px 0' }}>
              Purchase Failed
            </h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 20px 0' }}>
              {errorMsg}
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '8px 24px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
                color: '#d1d5db', fontSize: '13px', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
