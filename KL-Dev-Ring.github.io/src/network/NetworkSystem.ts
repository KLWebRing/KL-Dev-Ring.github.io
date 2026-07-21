// ── KL DevVerse — Client Network System ──────────────────────────────
// Manages the Colyseus connection, sends local player state at 20Hz,
// receives remote player states, and dispatches events.
// Does NOT modify the Phase 1 game loop — it reads from gameStore and
// writes to the remotePlayers map.

import { Client, Room } from 'colyseus.js';
import type { ConnectionState, RemotePlayer, RemotePlayerSnapshot } from '@/shared/types';
import type { ServerChatMessage, ServerSystemMessage, ServerEmoteBroadcast } from '@shared/protocol';
import { NETWORK } from '@shared/constants';

// ── Types ────────────────────────────────────────────────────────────

interface NetworkCallbacks {
  onConnectionChange: (state: ConnectionState) => void;
  onRemotePlayerJoin: (player: RemotePlayer) => void;
  onRemotePlayerLeave: (sessionId: string) => void;
  onRemotePlayerUpdate: (sessionId: string, snapshot: RemotePlayerSnapshot) => void;
  onChatMessage: (msg: ServerChatMessage) => void;
  onSystemMessage: (msg: ServerSystemMessage) => void;
  onEmoteBroadcast: (msg: ServerEmoteBroadcast) => void;
}

interface JoinOptions {
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string;
  readonly level: number;
  readonly accessToken: string;
}

// ── Network System Singleton ─────────────────────────────────────────

export class NetworkSystem {
  private client: Client | null = null;
  private room: Room | null = null;
  private callbacks: NetworkCallbacks | null = null;

  private sendInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts: number = 0;
  private connectionState: ConnectionState = 'disconnected';
  private sequenceNumber: number = 0;

  // Last sent state (for delta detection)
  private lastSentX: number = 0;
  private lastSentZ: number = 0;
  private lastSentAnimState: string = 'idle';

  /** Register callbacks before connecting */
  setCallbacks(callbacks: NetworkCallbacks): void {
    this.callbacks = callbacks;
  }

  /** Connect to the Colyseus game server */
  async connect(serverUrl: string, options: JoinOptions): Promise<void> {
    if (this.room) {
      await this.disconnect();
    }

    this.setConnectionState('connecting');

    try {
      this.client = new Client(serverUrl);
      this.room = await this.client.joinOrCreate('town', options);
      this.reconnectAttempts = 0;
      this.setConnectionState('connected');

      this.setupRoomListeners();
      this.startSendLoop();
    } catch (err) {
      console.error('[NetworkSystem] Failed to connect:', err);
      this.setConnectionState('error');
      this.scheduleReconnect(serverUrl, options);
    }
  }

  /** Disconnect cleanly */
  async disconnect(): Promise<void> {
    this.stopSendLoop();

    if (this.room) {
      try {
        await this.room.leave();
      } catch {
        // Room may already be closed
      }
      this.room = null;
    }

    this.client = null;
    this.setConnectionState('disconnected');
  }

  /** Send local player position (called by the send loop, not per-frame) */
  sendPlayerMove(x: number, y: number, z: number, yaw: number, animState: string): void {
    if (!this.room) return;

    // Delta detection — only send if position changed meaningfully
    const dx = x - this.lastSentX;
    const dz = z - this.lastSentZ;
    const posChanged = (dx * dx + dz * dz) > 0.001;
    const animChanged = animState !== this.lastSentAnimState;

    if (!posChanged && !animChanged) return;

    this.lastSentX = x;
    this.lastSentZ = z;
    this.lastSentAnimState = animState;

    this.room.send('player_move', {
      x, y, z, yaw, animState,
      seq: ++this.sequenceNumber,
    });
  }

  /** Send emote */
  sendEmote(emoteType: string): void {
    this.room?.send('emote', { emoteType });
  }

  /** Send chat message */
  sendChatMessage(channel: string, content: string, targetId?: string): void {
    this.room?.send('chat_message', { channel, content, targetId });
  }

  /** Get current connection state */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /** Get local session ID */
  getSessionId(): string | null {
    return this.room?.sessionId ?? null;
  }

  // ── Private ────────────────────────────────────────────────────────

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.callbacks?.onConnectionChange(state);
  }

  private setupRoomListeners(): void {
    if (!this.room) return;

    // Player state changes via Colyseus schema
    this.room.state.players.onAdd((player: Record<string, unknown>, sessionId: string) => {
      // Don't add self
      if (sessionId === this.room?.sessionId) return;

      const remote: RemotePlayer = {
        sessionId,
        userId: player['userId'] as string,
        username: player['username'] as string,
        avatarUrl: player['avatarUrl'] as string,
        level: player['level'] as number,
        x: player['x'] as number,
        y: player['y'] as number,
        z: player['z'] as number,
        yaw: player['yaw'] as number,
        animState: (player['animState'] as string) as RemotePlayer['animState'],
        activeEmote: null,
        emoteStartTime: 0,
        stateBuffer: [],
      };

      this.callbacks?.onRemotePlayerJoin(remote);

      // Listen for changes on this player
      (player as { onChange?: (callback: () => void) => void }).onChange?.(() => {
        const snapshot: RemotePlayerSnapshot = {
          x: player['x'] as number,
          y: player['y'] as number,
          z: player['z'] as number,
          yaw: player['yaw'] as number,
          animState: player['animState'] as string,
          timestamp: Date.now(),
        };
        this.callbacks?.onRemotePlayerUpdate(sessionId, snapshot);
      });
    });

    this.room.state.players.onRemove((_player: unknown, sessionId: string) => {
      this.callbacks?.onRemotePlayerLeave(sessionId);
    });

    // Chat messages
    this.room.onMessage('chat_message', (msg: ServerChatMessage) => {
      this.callbacks?.onChatMessage(msg);
    });

    // System messages
    this.room.onMessage('system_message', (msg: ServerSystemMessage) => {
      this.callbacks?.onSystemMessage(msg);
    });

    // Emote broadcasts
    this.room.onMessage('emote_broadcast', (msg: ServerEmoteBroadcast) => {
      this.callbacks?.onEmoteBroadcast(msg);
    });

    // Room error / leave
    this.room.onLeave((code: number) => {
      console.warn(`[NetworkSystem] Left room with code ${code}`);
      this.stopSendLoop();

      if (code >= 1000 && code <= 1015) {
        // Normal close
        this.setConnectionState('disconnected');
      } else {
        // Abnormal — try reconnect
        this.setConnectionState('reconnecting');
      }
    });

    this.room.onError((code: number, message?: string) => {
      console.error(`[NetworkSystem] Room error ${code}: ${message}`);
      this.setConnectionState('error');
    });
  }

  private startSendLoop(): void {
    this.stopSendLoop();

    // 20Hz send loop — reads from gameStore
    this.sendInterval = setInterval(() => {
      // Caller is responsible for calling sendPlayerMove with current state
      // This is handled by the gameStore subscriber in networkStore
    }, NETWORK.TICK_INTERVAL_MS);
  }

  private stopSendLoop(): void {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
  }

  private scheduleReconnect(serverUrl: string, options: JoinOptions): void {
    if (this.reconnectAttempts >= NETWORK.RECONNECT_MAX_RETRIES) {
      console.error('[NetworkSystem] Max reconnection attempts reached');
      this.setConnectionState('error');
      return;
    }

    const delay = Math.min(
      NETWORK.RECONNECT_BASE_DELAY_MS * Math.pow(2, this.reconnectAttempts),
      NETWORK.RECONNECT_MAX_DELAY_MS,
    );

    this.reconnectAttempts++;
    console.log(`[NetworkSystem] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      void this.connect(serverUrl, options);
    }, delay);
  }
}

/** Singleton network system instance */
export const networkSystem = new NetworkSystem();
