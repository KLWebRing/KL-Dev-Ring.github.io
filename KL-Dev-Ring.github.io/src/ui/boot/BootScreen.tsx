// ── KL DevVerse — Boot Screen ─────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useUIStore } from '@/stores/uiStore';

const BOOT_LINES: [string, number][] = [
  ['Initializing Kerala Builder Network...', 20],
  ['Rendering 3D Neighborhoods...', 55],
  ['Spawning Residents & Workshops...', 80],
  ['Developer Town Ready. WASD to walk.', 100],
];

export const BootScreen: React.FC = () => {
  const { hasBooted, setHasBooted } = useUIStore();
  const [visible, setVisible] = useState(!hasBooted);
  const [lineIndex, setLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [line, setLine] = useState(BOOT_LINES[0]?.[0] ?? '');

  useEffect(() => {
    if (hasBooted) return;

    let idx = 0;
    const tick = () => {
      if (idx >= BOOT_LINES.length) {
        setTimeout(() => {
          setVisible(false);
          setHasBooted(true);
        }, 300);
        return;
      }
      const [text, prog] = BOOT_LINES[idx] ?? ['', 0];
      setLine(text);
      setProgress(prog);
      setLineIndex(idx);
      idx++;
      setTimeout(tick, 450);
    };

    const timer = setTimeout(tick, 100);
    return () => clearTimeout(timer);
  }, [hasBooted, setHasBooted]);

  if (!visible) return null;

  const metrics = lineIndex === BOOT_LINES.length - 1
    ? 'SYSTEM ONLINE / WORLD VIEWPORT READY'
    : `PACKET SIGNAL ${lineIndex + 1} ESTABLISHED`;

  return (
    <div className={`boot${!visible ? ' hidden' : ''}`} role="dialog" aria-label="Initializing KL DevVerse">
      <button
        className="boot-skip"
        onClick={() => { setVisible(false); setHasBooted(true); }}
      >
        Skip intro ↗
      </button>

      <div className="boot-radar" aria-hidden="true">
        <i /><i /><i />
      </div>

      <div className="boot-copy">
        <span className="eyebrow">KL / DEVVERSE BOOT</span>
        <h1>{line}</h1>
        <div className="boot-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="boot-metrics">{metrics}</div>
      </div>
    </div>
  );
};
