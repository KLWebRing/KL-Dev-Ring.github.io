// ── KL DevVerse — Redis Service ──────────────────────────────────────
// Wraps ioredis as a NestJS injectable service.
// Supports both local Redis and Upstash Redis (TLS).
// Gracefully degrades if Redis is unavailable.

import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly subscriber: Redis;
  private connected = false;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    const isTLS = url.startsWith('rediss://');

    const baseOptions: Redis.RedisOptions = {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 200, 3000),
      lazyConnect: true,
      ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}),
    };

    this.client = new Redis(url, baseOptions);
    this.subscriber = new Redis(url, baseOptions);

    this.client.on('connect', () => {
      this.connected = true;
      this.logger.log('Redis client connected');
    });
    this.client.on('error', (err) => {
      this.connected = false;
      this.logger.warn(`Redis client error: ${err.message}`);
    });
    this.subscriber.on('connect', () => this.logger.log('Redis subscriber connected'));
    this.subscriber.on('error', (err) => this.logger.warn(`Redis subscriber error: ${err.message}`));

    // Attempt connection — non-blocking
    void this.client.connect().catch((err) => {
      this.logger.warn(`Redis connection failed — running without cache: ${err.message}`);
    });
    void this.subscriber.connect().catch(() => {
      // Subscriber failure is non-critical
    });
  }

  /** Whether Redis is currently connected */
  isConnected(): boolean {
    return this.connected;
  }

  /** Get the main Redis client for commands */
  getClient(): Redis {
    return this.client;
  }

  /** Get the subscriber client for pub/sub */
  getSubscriber(): Redis {
    return this.subscriber;
  }

  // ── Convenience wrappers (graceful degradation) ───────────────────

  async get(key: string): Promise<string | null> {
    if (!this.connected) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.connected) return;
    try {
      if (ttlSeconds) {
        await this.client.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, value);
      }
    } catch {
      // Cache write failure is non-critical
    }
  }

  async del(key: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.del(key);
    } catch {
      // Non-critical
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.hset(key, field, value);
    } catch {
      // Non-critical
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.connected) return null;
    try {
      return await this.client.hget(key, field);
    } catch {
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.connected) return {};
    try {
      return await this.client.hgetall(key);
    } catch {
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.hdel(key, field);
    } catch {
      // Non-critical
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    if (!this.connected) return;
    try {
      await this.client.publish(channel, message);
    } catch {
      // Non-critical
    }
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (!this.connected) return;
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => {
        if (ch === channel) handler(msg);
      });
    } catch {
      // Non-critical
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.client.quit();
      await this.subscriber.quit();
    } catch {
      // Swallow disconnect errors
    }
  }
}
