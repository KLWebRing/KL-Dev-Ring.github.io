// ── KL DevVerse — Network Protocol ───────────────────────────────────
// Shared between client and server.
// Defines all message types flowing over the wire.
// IMPORTANT: This file must not import any client-only or server-only code.

// ── Message Types (Client → Server) ─────────────────────────────────

/** Sent at 20Hz — local player position + state */
export interface ClientPlayerMove {
  readonly type: 'player_move';
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly animState: string;
  readonly seq: number; // sequence number for reconciliation
}

/** Player triggers an emote */
export interface ClientEmote {
  readonly type: 'emote';
  readonly emoteType: EmoteType;
}

/** Chat message from client */
export interface ClientChatMessage {
  readonly type: 'chat_message';
  readonly channel: ChatChannel;
  readonly content: string;
  readonly targetId?: string; // userId for DM
}

/** Friend system actions */
export interface ClientFriendAction {
  readonly type: 'friend_action';
  readonly action: 'send_request' | 'accept' | 'reject' | 'remove';
  readonly targetUserId: string;
}

export type ClientMessage =
  | ClientPlayerMove
  | ClientEmote
  | ClientChatMessage
  | ClientFriendAction;

// ── Message Types (Server → Client) ─────────────────────────────────

/** Authoritative state for one remote player */
export interface ServerPlayerState {
  readonly sessionId: string;
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string;
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
  readonly animState: string;
  readonly emoteType?: EmoteType;
  readonly timestamp: number;
}

/** Broadcasted when a new player joins the room */
export interface ServerPlayerJoin {
  readonly type: 'player_join';
  readonly sessionId: string;
  readonly userId: string;
  readonly username: string;
  readonly avatarUrl: string;
  readonly level: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Broadcasted when a player leaves the room */
export interface ServerPlayerLeave {
  readonly type: 'player_leave';
  readonly sessionId: string;
}

/** Chat message from server (includes author info) */
export interface ServerChatMessage {
  readonly type: 'chat_message';
  readonly id: string;
  readonly channel: ChatChannel;
  readonly authorId: string;
  readonly authorName: string;
  readonly authorAvatar: string;
  readonly content: string;
  readonly timestamp: number;
}

/** System broadcast (join/leave/announcement) */
export interface ServerSystemMessage {
  readonly type: 'system_message';
  readonly subType: 'join' | 'leave' | 'announcement';
  readonly content: string;
  readonly timestamp: number;
}

/** Emote broadcast to all nearby players */
export interface ServerEmoteBroadcast {
  readonly type: 'emote_broadcast';
  readonly sessionId: string;
  readonly emoteType: EmoteType;
}

/** Friend system notification */
export interface ServerFriendUpdate {
  readonly type: 'friend_update';
  readonly subType: 'request_received' | 'request_accepted' | 'request_rejected' | 'removed';
  readonly userId: string;
  readonly username: string;
}

export type ServerMessage =
  | ServerPlayerJoin
  | ServerPlayerLeave
  | ServerChatMessage
  | ServerSystemMessage
  | ServerEmoteBroadcast
  | ServerFriendUpdate;

// ── Enums ────────────────────────────────────────────────────────────

export type EmoteType = 'wave' | 'clap' | 'point' | 'dance' | 'sit' | 'celebrate';

export type ChatChannel = 'global' | 'nearby' | 'district' | 'private' | 'system';

export type PlayerStatus = 'online' | 'away' | 'busy' | 'offline';

// ── Auth ─────────────────────────────────────────────────────────────

export interface AuthTokenPayload {
  readonly sub: string;       // userId
  readonly username: string;
  readonly iat: number;
  readonly exp: number;
}

export interface AuthResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly user: AuthUser;
}

export interface AuthUser {
  readonly id: string;
  readonly githubId: number;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly profileUrl: string;
  readonly email: string | null;
}
