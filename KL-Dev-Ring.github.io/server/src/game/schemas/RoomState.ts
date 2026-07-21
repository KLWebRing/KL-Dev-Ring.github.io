// ── KL DevVerse — Colyseus Room State Schema ────────────────────────
// Top-level room state — contains all players.

import { Schema, MapSchema, type } from '@colyseus/schema';
import { PlayerState } from './PlayerState';

export class RoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
