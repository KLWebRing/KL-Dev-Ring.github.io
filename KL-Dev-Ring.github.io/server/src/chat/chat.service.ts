// ── KL DevVerse — Chat Service ───────────────────────────────────────
// Persists chat messages to PostgreSQL.
// Real-time delivery is handled by Colyseus TownRoom.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ChatChannel as PrismaChatChannel } from '@prisma/client';

type ChannelInput = 'global' | 'nearby' | 'district' | 'private' | 'system';

const CHANNEL_MAP: Record<ChannelInput, PrismaChatChannel> = {
  global: 'GLOBAL',
  nearby: 'NEARBY',
  district: 'DISTRICT',
  private: 'PRIVATE',
  system: 'SYSTEM',
};

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Persist a chat message */
  async saveMessage(input: {
    authorId: string;
    channel: ChannelInput;
    content: string;
    targetId?: string;
  }) {
    return this.prisma.message.create({
      data: {
        authorId: input.authorId,
        channel: CHANNEL_MAP[input.channel] ?? 'GLOBAL',
        content: input.content.slice(0, 1000),
        targetId: input.targetId,
      },
    });
  }

  /** Get recent messages for a channel */
  async getRecentMessages(channel: ChannelInput, limit: number = 50) {
    const messages = await this.prisma.message.findMany({
      where: { channel: CHANNEL_MAP[channel] ?? 'GLOBAL' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    return messages.reverse().map((m) => ({
      id: m.id,
      channel: channel,
      authorId: m.authorId,
      authorName: m.author.username,
      authorAvatar: m.author.avatarUrl,
      content: m.content,
      timestamp: m.createdAt.getTime(),
    }));
  }

  /** Get private messages between two users */
  async getPrivateMessages(userAId: string, userBId: string, limit: number = 50) {
    const messages = await this.prisma.message.findMany({
      where: {
        channel: 'PRIVATE',
        OR: [
          { authorId: userAId, targetId: userBId },
          { authorId: userBId, targetId: userAId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        author: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    return messages.reverse().map((m) => ({
      id: m.id,
      channel: 'private' as const,
      authorId: m.authorId,
      authorName: m.author.username,
      authorAvatar: m.author.avatarUrl,
      content: m.content,
      timestamp: m.createdAt.getTime(),
    }));
  }
}
