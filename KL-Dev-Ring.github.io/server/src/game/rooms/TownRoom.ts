// ── KL DevVerse — Town Room (Colyseus) ───────────────────────────────
// The main game room. Handles player lifecycle and state synchronization.
// Authoritative server — validates all client input.

import { Room, Client } from '@colyseus/core';
import { RoomState } from '../schemas/RoomState';
import { PlayerState } from '../schemas/PlayerState';

interface JoinOptions {
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string;
  readonly level: number;
  readonly accessToken: string;
}

interface MoveMessage {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly animState: string;
  readonly seq: number;
}

interface EmoteMessage {
  readonly emoteType: string;
}

interface ChatMessage {
  readonly channel: string;
  readonly content: string;
  readonly targetId?: string;
}

const VALID_ANIM_STATES = new Set([
  'idle', 'walk', 'run', 'jump', 'landing',
  'wave', 'clap', 'point', 'dance', 'sit', 'celebrate', 'talk',
]);

const VALID_EMOTES = new Set([
  'wave', 'clap', 'point', 'dance', 'sit', 'celebrate',
]);

const MAX_SPEED = 15; // units/second — slightly above sprint speed to allow for network jitter
const MAX_POSITION = 500; // max absolute coordinate value

export class TownRoom extends Room<RoomState> {
  maxClients = 100;

  private lastPositions = new Map<string, { x: number; z: number; time: number }>();

  onCreate(): void {
    this.setState(new RoomState());
    this.setSimulationInterval(() => this.tick(), 50); // 20Hz

    // ── Player Movement ────────────────────────────────────────────
    this.onMessage('player_move', (client: Client, msg: MoveMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Validate position bounds
      if (
        !isFinite(msg.x) || !isFinite(msg.y) || !isFinite(msg.z) ||
        Math.abs(msg.x) > MAX_POSITION || Math.abs(msg.z) > MAX_POSITION ||
        msg.y < -10 || msg.y > 50
      ) {
        return; // Reject invalid position
      }

      // Speed validation
      const last = this.lastPositions.get(client.sessionId);
      const now = Date.now();
      if (last) {
        const dt = (now - last.time) / 1000;
        if (dt > 0.01) {
          const dx = msg.x - last.x;
          const dz = msg.z - last.z;
          const speed = Math.sqrt(dx * dx + dz * dz) / dt;
          if (speed > MAX_SPEED) {
            return; // Reject speed hack
          }
        }
      }
      this.lastPositions.set(client.sessionId, { x: msg.x, z: msg.z, time: now });

      // Validate anim state
      const animState = VALID_ANIM_STATES.has(msg.animState) ? msg.animState : 'idle';

      // Apply
      player.x = msg.x;
      player.y = msg.y;
      player.z = msg.z;
      player.yaw = msg.yaw;
      player.animState = animState;
      player.timestamp = now;
    });

    // ── Emotes ─────────────────────────────────────────────────────
    this.onMessage('emote', (client: Client, msg: EmoteMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (!VALID_EMOTES.has(msg.emoteType)) return;

      player.emoteType = msg.emoteType;
      player.animState = msg.emoteType;

      // Broadcast to all other clients
      this.broadcast('emote_broadcast', {
        sessionId: client.sessionId,
        emoteType: msg.emoteType,
      }, { except: client });

      // Clear emote after 3 seconds
      this.clock.setTimeout(() => {
        const p = this.state.players.get(client.sessionId);
        if (p && p.emoteType === msg.emoteType) {
          p.emoteType = '';
        }
      }, 3000);
    });

    // ── Chat ───────────────────────────────────────────────────────
    this.onMessage('chat_message', (client: Client, msg: ChatMessage) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      // Validate content
      const content = (msg.content ?? '').trim();
      if (!content || content.length > 1000) return;

      const chatPayload = {
        type: 'chat_message' as const,
        id: `${client.sessionId}-${Date.now()}`,
        channel: msg.channel ?? 'global',
        authorId: player.userId,
        authorName: player.username,
        authorAvatar: player.avatarUrl,
        content,
        timestamp: Date.now(),
      };

      if (msg.channel === 'nearby') {
        // Only send to players within 30 units
        this.state.players.forEach((p, sid) => {
          const dx = p.x - player.x;
          const dz = p.z - player.z;
          if (Math.sqrt(dx * dx + dz * dz) <= 30) {
            const target = this.clients.find((c) => c.sessionId === sid);
            target?.send('chat_message', chatPayload);
          }
        });
      } else if (msg.channel === 'private' && msg.targetId) {
        // DM — send to target and sender
        this.state.players.forEach((p, sid) => {
          if (p.userId === msg.targetId || sid === client.sessionId) {
            const target = this.clients.find((c) => c.sessionId === sid);
            target?.send('chat_message', chatPayload);
          }
        });
      } else {
        // Global broadcast
        this.broadcast('chat_message', chatPayload);
      }
    });

    this.clock.start();
  }

  onJoin(client: Client, options: JoinOptions): void {
    const player = new PlayerState();
    player.sessionId = client.sessionId;
    player.userId = options.userId ?? '';
    player.username = options.username ?? 'Guest';
    player.avatarUrl = options.avatarUrl ?? '';
    player.level = options.level ?? 1;
    player.x = 0;
    player.y = 0.35;
    player.z = 12;
    player.timestamp = Date.now();

    this.state.players.set(client.sessionId, player);
    this.lastPositions.set(client.sessionId, { x: 0, z: 12, time: Date.now() });

    // Notify everyone
    this.broadcast('system_message', {
      type: 'system_message',
      subType: 'join',
      content: `${player.username} joined the town`,
      timestamp: Date.now(),
    });
  }

  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    const username = player?.username ?? 'Unknown';

    this.state.players.delete(client.sessionId);
    this.lastPositions.delete(client.sessionId);

    this.broadcast('system_message', {
      type: 'system_message',
      subType: 'leave',
      content: `${username} left the town`,
      timestamp: Date.now(),
    });
  }

  onDispose(): void {
    this.lastPositions.clear();
  }

  private tick(): void {
    // Server tick — future: NPC AI, world events, AFK detection
    // Currently Colyseus auto-broadcasts state changes
  }
}
