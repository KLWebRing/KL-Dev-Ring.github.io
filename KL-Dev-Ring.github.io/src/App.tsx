// ── KL DevVerse — Root Application ───────────────────────────────────
// Wires together: R3F Canvas, GameEngine, WorldScene, HUD, Modals,
// Auth, Network, Chat, and Emote systems.

import React, { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GameEngine } from '@/core/GameEngine';
import { WorldScene } from '@/world/WorldScene';
import { RemotePlayerRenderer } from '@/network/RemotePlayerRenderer';
import { HUD } from '@/ui/hud/HUD';
import { BootScreen } from '@/ui/boot/BootScreen';
import { ModalSystem } from '@/ui/modals/ModalSystem';
import { LoginScreen } from '@/auth/LoginScreen';
import { ConnectionStatus } from '@/ui/hud/ConnectionStatus';
import { ChatWindow } from '@/chat/ChatWindow';
import { EmoteWheel } from '@/ui/hud/EmoteWheel';
import { useWorldStore } from '@/stores/worldStore';
import { useAuthStore } from '@/auth/authStore';
import { useNetworkStore } from '@/stores/networkStore';
import { networkSystem } from '@/network/NetworkSystem';
import { useGameStore } from '@/stores/gameStore';
import { RENDER } from '@/shared/constants';
import { NETWORK } from '@shared/constants';
import './app.css';

// Loading fallback inside the canvas
const SceneLoader: React.FC = () => null;

export const App: React.FC = () => {
  const fetchNetworkData = useWorldStore(s => s.fetchNetworkData);
  const { loadError } = useWorldStore();
  const { isAuthenticated, user, accessToken, initialize: initAuth } = useAuthStore();
  const { connectionState } = useNetworkStore();

  // Initialize auth on startup
  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // Load member network data on startup
  useEffect(() => {
    void fetchNetworkData();
  }, [fetchNetworkData]);

  // Connect to game server when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user || !accessToken) return;

    const serverUrl = import.meta.env.VITE_COLYSEUS_URL ?? 'ws://localhost:2567';

    // Wire up network callbacks
    networkSystem.setCallbacks({
      onConnectionChange: (state) => {
        useNetworkStore.getState().setConnectionState(state);
        if (state === 'connected') {
          useNetworkStore.getState().setLocalSessionId(networkSystem.getSessionId());
        }
      },
      onRemotePlayerJoin: (player) => {
        useNetworkStore.getState().addRemotePlayer(player);
      },
      onRemotePlayerLeave: (sessionId) => {
        useNetworkStore.getState().removeRemotePlayer(sessionId);
      },
      onRemotePlayerUpdate: (sessionId, snapshot) => {
        useNetworkStore.getState().updateRemotePlayer(sessionId, snapshot);
      },
      onChatMessage: (msg) => {
        useNetworkStore.getState().addChatMessage({
          id: msg.id,
          channel: msg.channel,
          authorId: msg.authorId,
          authorName: msg.authorName,
          authorAvatar: msg.authorAvatar,
          content: msg.content,
          timestamp: msg.timestamp,
        });
      },
      onSystemMessage: (msg) => {
        useNetworkStore.getState().addChatMessage({
          id: `sys-${msg.timestamp}`,
          channel: 'system',
          authorId: 'system',
          authorName: 'System',
          authorAvatar: '',
          content: msg.content,
          timestamp: msg.timestamp,
          isSystem: true,
        });
      },
      onEmoteBroadcast: (msg) => {
        useNetworkStore.getState().setRemoteEmote(
          msg.sessionId,
          msg.emoteType as import('@shared/protocol').EmoteType,
        );
        // Auto-clear after 3 seconds
        setTimeout(() => {
          useNetworkStore.getState().clearRemoteEmote(msg.sessionId);
        }, 3000);
      },
    });

    void networkSystem.connect(serverUrl, {
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      level: 1,
      accessToken,
    });

    // 20Hz send loop — reads player state from gameStore
    const sendLoop = setInterval(() => {
      const { player } = useGameStore.getState();
      networkSystem.sendPlayerMove(
        player.x, player.y, player.z,
        player.yaw, player.animState,
      );
    }, NETWORK.TICK_INTERVAL_MS);

    return () => {
      clearInterval(sendLoop);
      void networkSystem.disconnect();
    };
  }, [isAuthenticated, user, accessToken]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#080b0c' }}>
      {/* ── 3D Canvas ──────────────────────────────────────────────── */}
      <Canvas
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
        shadows
        style={{ position: 'absolute', inset: 0 }}
        onCreated={({ gl }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, RENDER.MAX_PIXEL_RATIO));
        }}
      >
        <Suspense fallback={<SceneLoader />}>
          {/* Core engine — player, camera, input, game loop */}
          <GameEngine />
          {/* World geometry, NPCs, interactables */}
          <WorldScene />
          {/* Multiplayer — render other players */}
          <RemotePlayerRenderer />
        </Suspense>
      </Canvas>

      {/* ── React HUD Layer ───────────────────────────────────────── */}
      <div className="hud-root" aria-label="Game HUD">
        <HUD />
      </div>

      {/* ── Connection Status ──────────────────────────────────────── */}
      <ConnectionStatus />

      {/* ── Chat Window ────────────────────────────────────────────── */}
      <ChatWindow />

      {/* ── Emote Wheel ────────────────────────────────────────────── */}
      <EmoteWheel />

      {/* ── Login (when not authenticated) ─────────────────────────── */}
      {!isAuthenticated && <LoginScreen />}

      {/* ── Screen Fade Overlay ───────────────────────────────────── */}
      <div id="screenOverlay" className="screen-overlay" />

      {/* ── Modals ───────────────────────────────────────────────── */}
      <ModalSystem />

      {/* ── Boot Screen (above everything) ───────────────────────── */}
      <BootScreen />

      {/* ── Load error fallback ──────────────────────────────────── */}
      {loadError && (
        <div style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1f0a0a', border: '1px solid #7f1d1d', color: '#fca5a5',
          padding: '8px 16px', borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 11, zIndex: 200,
        }}>
          ⚠ Could not load network data — run <code style={{ color: '#fbbf24' }}>npm run build</code> first
        </div>
      )}
    </div>
  );
};
