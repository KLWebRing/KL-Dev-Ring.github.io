// ── KL DevVerse — Shared Constants ───────────────────────────────────
// Constants shared between client and server.
// IMPORTANT: No client-only or server-only imports.

export const NETWORK = {
  /** Server sends state updates at this rate */
  TICK_RATE_HZ: 20,
  /** Milliseconds between server ticks */
  TICK_INTERVAL_MS: 50,

  /** Client interpolation buffer size (frames) */
  INTERPOLATION_BUFFER_SIZE: 3,
  /** Interpolation delay in milliseconds */
  INTERPOLATION_DELAY_MS: 150,

  /** If server position differs by more than this, apply correction */
  PREDICTION_CORRECTION_THRESHOLD: 0.5,
  /** Smoothing factor for prediction correction (0 = snap, 1 = ignore) */
  PREDICTION_CORRECTION_SMOOTHING: 0.1,

  /** Max players per room */
  MAX_PLAYERS_PER_ROOM: 100,

  /** Nearby chat radius in world units */
  NEARBY_CHAT_RADIUS: 30,
  /** Nearby player interaction radius */
  INTERACTION_RADIUS: 4.0,

  /** Max chat message length */
  MAX_CHAT_LENGTH: 1000,
  /** Max username length */
  MAX_USERNAME_LENGTH: 39, // GitHub max

  /** WebSocket reconnection */
  RECONNECT_MAX_RETRIES: 5,
  RECONNECT_BASE_DELAY_MS: 1000,
  RECONNECT_MAX_DELAY_MS: 30000,

  /** Heartbeat interval */
  HEARTBEAT_INTERVAL_MS: 10000,
  /** Player considered AFK after this duration */
  AFK_TIMEOUT_MS: 300000, // 5 minutes
} as const;

export const AUTH = {
  /** JWT access token lifetime */
  ACCESS_TOKEN_EXPIRY: '15m',
  /** Refresh token lifetime */
  REFRESH_TOKEN_EXPIRY: '7d',
  /** Cookie name for refresh token */
  REFRESH_COOKIE_NAME: 'kl_refresh_token',
} as const;

export const PRESENCE = {
  /** How often to persist presence to DB (Redis is real-time) */
  PERSIST_INTERVAL_MS: 60000,
  /** Consider user offline after this heartbeat gap */
  OFFLINE_THRESHOLD_MS: 30000,
} as const;
