// ── KL DevVerse — Presence Service ───────────────────────────────────
// Tracks player online status via Redis.
// Hot data in Redis, periodically persisted to PostgreSQL.

import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

interface PresenceData {
  readonly userId: string;
  readonly username: string;
  readonly status: string;
  readonly district: string;
  readonly posX: number;
  readonly posZ: number;
  readonly activity: string;
  readonly lastSeen: number;
}

const PRESENCE_KEY = 'presence';
const PRESENCE_TTL = 300; // 5 minutes

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /** Mark a user as online */
  async setOnline(userId: string, data: Partial<PresenceData>): Promise<void> {
    const presence: PresenceData = {
      userId,
      username: data.username ?? '',
      status: 'online',
      district: data.district ?? 'town',
      posX: data.posX ?? 0,
      posZ: data.posZ ?? 12,
      activity: data.activity ?? 'exploring',
      lastSeen: Date.now(),
    };

    await this.redis.hset(PRESENCE_KEY, userId, JSON.stringify(presence));
  }

  /** Update position (called from game loop, high frequency) */
  async updatePosition(userId: string, x: number, z: number): Promise<void> {
    const raw = await this.redis.hget(PRESENCE_KEY, userId);
    if (!raw) return;

    const data = JSON.parse(raw) as PresenceData;
    const updated: PresenceData = {
      ...data,
      posX: x,
      posZ: z,
      lastSeen: Date.now(),
    };

    await this.redis.hset(PRESENCE_KEY, userId, JSON.stringify(updated));
  }

  /** Mark a user as offline */
  async setOffline(userId: string): Promise<void> {
    await this.redis.hdel(PRESENCE_KEY, userId);

    // Persist final status to DB
    try {
      await this.prisma.presence.upsert({
        where: { userId },
        update: {
          status: 'OFFLINE',
          lastSeen: new Date(),
        },
        create: {
          userId,
          status: 'OFFLINE',
          lastSeen: new Date(),
        },
      });
    } catch (err) {
      this.logger.warn(`Failed to persist offline status for ${userId}`, err);
    }
  }

  /** Get all online users */
  async getOnlineUsers(): Promise<PresenceData[]> {
    const all = await this.redis.hgetall(PRESENCE_KEY);
    return Object.values(all).map((v) => JSON.parse(v) as PresenceData);
  }

  /** Get online count */
  async getOnlineCount(): Promise<number> {
    const all = await this.redis.hgetall(PRESENCE_KEY);
    return Object.keys(all).length;
  }

  /** Check if a specific user is online */
  async isOnline(userId: string): Promise<boolean> {
    const raw = await this.redis.hget(PRESENCE_KEY, userId);
    return raw !== null;
  }

  /** Get presence data for a specific user */
  async getPresence(userId: string): Promise<PresenceData | null> {
    const raw = await this.redis.hget(PRESENCE_KEY, userId);
    return raw ? (JSON.parse(raw) as PresenceData) : null;
  }

  /** Get presence for multiple users (batch) */
  async getPresenceBatch(userIds: string[]): Promise<Map<string, PresenceData>> {
    const result = new Map<string, PresenceData>();
    for (const id of userIds) {
      const data = await this.getPresence(id);
      if (data) result.set(id, data);
    }
    return result;
  }
}
