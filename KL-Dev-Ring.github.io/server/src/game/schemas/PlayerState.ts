// ── KL DevVerse — Colyseus Player State Schema ──────────────────────
// Schema-encoded player state for efficient binary serialization.

import { Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') sessionId: string = '';
  @type('string') userId: string = '';
  @type('string') username: string = '';
  @type('string') avatarUrl: string = '';
  @type('uint8') level: number = 1;
  @type('float32') x: number = 0;
  @type('float32') y: number = 0.35;
  @type('float32') z: number = 12;
  @type('float32') yaw: number = 0;
  @type('string') animState: string = 'idle';
  @type('string') emoteType: string = '';
  @type('float64') timestamp: number = 0;
}
