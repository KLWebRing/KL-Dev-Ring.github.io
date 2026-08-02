// ── KL DevVerse — Timeline Service ───────────────────────────────────
// Records and retrieves significant events in a builder's journey.
// Called by other services when meaningful events occur.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TimelineType } from '@prisma/client';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Add a timeline entry. Called by other services on significant events.
   */
  async addEntry(
    userId: string,
    entryType: TimelineType,
    title: string,
    description: string = '',
    metadata: Record<string, unknown> = {},
    isPublic: boolean = true,
  ) {
    const entry = await this.prisma.timelineEntry.create({
      data: {
        userId,
        entryType,
        title,
        description,
        metadata: JSON.stringify(metadata),
        isPublic,
      },
    });

    this.logger.log(`Timeline entry for ${userId}: [${entryType}] ${title}`);
    return entry;
  }

  /**
   * Get paginated timeline for a user (own view — includes private entries).
   */
  async getTimeline(userId: string, page: number = 1, limit: number = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.timelineEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timelineEntry.count({ where: { userId } }),
    ]);

    return {
      entries: entries.map(this.formatEntry),
      page,
      totalPages: Math.ceil(total / limit),
      total,
    };
  }

  /**
   * Get public timeline for a user (other players viewing their profile).
   */
  async getPublicTimeline(userId: string, page: number = 1, limit: number = DEFAULT_PAGE_SIZE) {
    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.timelineEntry.findMany({
        where: { userId, isPublic: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timelineEntry.count({ where: { userId, isPublic: true } }),
    ]);

    return {
      entries: entries.map(this.formatEntry),
      page,
      totalPages: Math.ceil(total / limit),
      total,
    };
  }

  /**
   * Get timeline stats for a user.
   */
  async getStats(userId: string) {
    const total = await this.prisma.timelineEntry.count({ where: { userId } });

    const byType = await this.prisma.timelineEntry.groupBy({
      by: ['entryType'],
      where: { userId },
      _count: true,
    });

    return {
      totalEntries: total,
      byType: byType.map(t => ({ type: t.entryType, count: t._count })),
    };
  }

  private formatEntry(entry: any) {
    let parsedMetadata = {};
    try {
      parsedMetadata = JSON.parse(entry.metadata);
    } catch { /* keep empty */ }

    return {
      id: entry.id,
      entryType: entry.entryType,
      title: entry.title,
      description: entry.description,
      metadata: parsedMetadata,
      isPublic: entry.isPublic,
      createdAt: entry.createdAt,
    };
  }
}
