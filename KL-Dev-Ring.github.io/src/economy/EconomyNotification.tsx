// ── KL DevVerse — Economy Notification ───────────────────────────────
// Toast-style notification overlay for economy events.
// Animated pop-in from top-right, stacked with auto-dismiss.

import React, { useState, useEffect } from 'react';
import { useNotificationStore, type EconomyNotificationDef } from '@/stores/notificationStore';

// ── CSS Animation (injected once) ───────────────────────────────────

const KEYFRAMES_ID = 'economyNotifKeyframes';

function injectKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes notifSlideIn {
      0% { transform: translateX(120%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
    @keyframes notifSlideOut {
      0% { transform: translateX(0); opacity: 1; }
      100% { transform: translateX(120%); opacity: 0; }
    }
    @keyframes notifProgress {
      0% { width: 100%; }
      100% { width: 0%; }
    }
  `;
  document.head.appendChild(style);
}

// ── Component ───────────────────────────────────────────────────────

export const EconomyNotification: React.FC = () => {
  const { notifications, dismiss, maxVisible } = useNotificationStore();

  useEffect(() => { injectKeyframes(); }, []);

  const visible = notifications.slice(-maxVisible);

  if (visible.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '70px',
      right: '12px',
      zIndex: 300,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none',
      width: '300px',
    }}>
      {visible.map((notif) => (
        <NotifToast key={notif.id} notif={notif} onDismiss={dismiss} />
      ))}
    </div>
  );
};

// ── Individual Toast ────────────────────────────────────────────────

const NotifToast: React.FC<{
  notif: EconomyNotificationDef;
  onDismiss: (id: string) => void;
}> = ({ notif, onDismiss }) => {
  const [exiting, setExiting] = useState(false);

  // Trigger exit animation before actual removal
  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, notif.duration - 400);

    return () => clearTimeout(exitTimer);
  }, [notif.duration]);

  return (
    <div
      style={{
        pointerEvents: 'auto',
        borderRadius: '12px',
        background: 'rgba(15, 15, 28, 0.95)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${notif.color}30`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 8px ${notif.color}20`,
        overflow: 'hidden',
        animation: exiting
          ? 'notifSlideOut 0.35s ease-in forwards'
          : 'notifSlideIn 0.35s ease-out forwards',
        cursor: 'pointer',
        fontFamily: "'Inter', sans-serif",
      }}
      onClick={() => onDismiss(notif.id)}
    >
      {/* Content */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 14px',
      }}>
        {/* Icon */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: `${notif.color}15`,
          border: `1px solid ${notif.color}25`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          flexShrink: 0,
        }}>
          {notif.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: notif.color,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {notif.title}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#9ca3af',
            marginTop: '1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {notif.message}
          </div>
        </div>

        {/* Close hint */}
        <div style={{
          fontSize: '10px',
          color: '#4b5563',
          flexShrink: 0,
        }}>
          ✕
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: '2px',
        background: 'rgba(255,255,255,0.05)',
      }}>
        <div style={{
          height: '100%',
          background: `linear-gradient(90deg, ${notif.color}, ${notif.color}80)`,
          animation: `notifProgress ${notif.duration}ms linear forwards`,
        }} />
      </div>
    </div>
  );
};
