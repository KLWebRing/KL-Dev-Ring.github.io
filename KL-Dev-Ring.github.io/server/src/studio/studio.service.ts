// ── KL DevVerse — Builder Studio Service ─────────────────────────────
// Manages Builder Studio CRUD, furniture placement, visitor tracking,
// and project wall. Every developer owns exactly ONE studio.

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudioService {
  private readonly logger = new Logger(StudioService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Studio CRUD ─────────────────────────────────────────────────────

  /**
   * Get or create a Builder Studio for a user.
   * Every authenticated user automatically gets a studio on first access.
   */
  async getOrCreateStudio(userId: string) {
    const existing = await this.prisma.builderStudio.findUnique({
      where: { userId },
      include: {
        furniture: true,
        decorations: true,
        projectWall: { orderBy: { slotIndex: 'asc' } },
        user: { select: { username: true, avatarUrl: true, displayName: true } },
        _count: { select: { visitors: true } },
      },
    });

    if (existing) {
      return this.formatStudio(existing);
    }

    // Auto-create with defaults
    const studio = await this.prisma.builderStudio.create({
      data: { userId },
      include: {
        furniture: true,
        decorations: true,
        projectWall: { orderBy: { slotIndex: 'asc' } },
        user: { select: { username: true, avatarUrl: true, displayName: true } },
        _count: { select: { visitors: true } },
      },
    });

    this.logger.log(`Builder Studio auto-created for user ${userId}`);
    return this.formatStudio(studio);
  }

  /**
   * Get a studio by user ID (for visiting).
   */
  async getStudioByUserId(userId: string) {
    const studio = await this.prisma.builderStudio.findUnique({
      where: { userId },
      include: {
        furniture: true,
        decorations: true,
        projectWall: { orderBy: { slotIndex: 'asc' } },
        user: { select: { username: true, avatarUrl: true, displayName: true } },
        _count: { select: { visitors: true } },
      },
    });

    if (!studio) {
      throw new NotFoundException('Builder Studio not found');
    }

    return this.formatStudio(studio);
  }

  /**
   * Update studio settings (theme, name, colors).
   */
  async updateStudio(userId: string, data: {
    name?: string;
    theme?: string;
    floorMat?: string;
    wallColor?: string;
    lightPreset?: string;
    isPublic?: boolean;
  }) {
    const studio = await this.prisma.builderStudio.findUnique({ where: { userId } });
    if (!studio) throw new NotFoundException('Builder Studio not found');

    return this.prisma.builderStudio.update({
      where: { userId },
      data,
    });
  }

  // ── Furniture ───────────────────────────────────────────────────────

  /**
   * Place furniture in a slot.
   */
  async placeFurniture(userId: string, data: {
    itemId: string;
    slotId: string;
    posX?: number;
    posZ?: number;
    rotation?: number;
    variant?: string;
  }) {
    const studio = await this.prisma.builderStudio.findUnique({ where: { userId } });
    if (!studio) throw new NotFoundException('Builder Studio not found');

    // Check if slot is already occupied — replace if so
    const existingInSlot = await this.prisma.studioFurniture.findFirst({
      where: { studioId: studio.id, slotId: data.slotId },
    });

    if (existingInSlot) {
      return this.prisma.studioFurniture.update({
        where: { id: existingInSlot.id },
        data: {
          itemId: data.itemId,
          posX: data.posX ?? 0,
          posZ: data.posZ ?? 0,
          rotation: data.rotation ?? 0,
          variant: data.variant ?? 'default',
        },
      });
    }

    return this.prisma.studioFurniture.create({
      data: {
        studioId: studio.id,
        itemId: data.itemId,
        slotId: data.slotId,
        posX: data.posX ?? 0,
        posZ: data.posZ ?? 0,
        rotation: data.rotation ?? 0,
        variant: data.variant ?? 'default',
      },
    });
  }

  /**
   * Remove furniture from a slot.
   */
  async removeFurniture(userId: string, furnitureId: string) {
    const studio = await this.prisma.builderStudio.findUnique({ where: { userId } });
    if (!studio) throw new NotFoundException('Builder Studio not found');

    const furniture = await this.prisma.studioFurniture.findUnique({
      where: { id: furnitureId },
    });

    if (!furniture || furniture.studioId !== studio.id) {
      throw new ForbiddenException('Cannot remove furniture from another studio');
    }

    return this.prisma.studioFurniture.delete({ where: { id: furnitureId } });
  }

  // ── Visitors ────────────────────────────────────────────────────────

  /**
   * Record a studio visit.
   */
  async recordVisit(studioId: string, visitorId: string) {
    return this.prisma.studioVisit.create({
      data: { studioId, visitorId },
    });
  }

  /**
   * Get recent visitors for a studio.
   */
  async getRecentVisitors(studioId: string, limit = 20) {
    return this.prisma.studioVisit.findMany({
      where: { studioId },
      orderBy: { visitedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get visitor count for a studio.
   */
  async getVisitorCount(studioId: string): Promise<number> {
    return this.prisma.studioVisit.count({ where: { studioId } });
  }

  // ── Project Wall ────────────────────────────────────────────────────

  /**
   * Pin a project to the display wall.
   */
  async pinProject(userId: string, data: {
    repoUrl: string;
    repoName: string;
    description: string;
    slotIndex: number;
  }) {
    const studio = await this.prisma.builderStudio.findUnique({ where: { userId } });
    if (!studio) throw new NotFoundException('Builder Studio not found');

    if (data.slotIndex < 0 || data.slotIndex > 5) {
      throw new ForbiddenException('Slot index must be 0-5');
    }

    return this.prisma.projectDisplay.upsert({
      where: {
        studioId_slotIndex: { studioId: studio.id, slotIndex: data.slotIndex },
      },
      create: {
        studioId: studio.id,
        repoUrl: data.repoUrl,
        repoName: data.repoName,
        description: data.description,
        slotIndex: data.slotIndex,
        pinned: true,
      },
      update: {
        repoUrl: data.repoUrl,
        repoName: data.repoName,
        description: data.description,
        pinned: true,
      },
    });
  }

  /**
   * Unpin a project from the wall.
   */
  async unpinProject(userId: string, slotIndex: number) {
    const studio = await this.prisma.builderStudio.findUnique({ where: { userId } });
    if (!studio) throw new NotFoundException('Builder Studio not found');

    return this.prisma.projectDisplay.deleteMany({
      where: { studioId: studio.id, slotIndex },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private formatStudio(studio: {
    id: string;
    userId: string;
    name: string;
    tier: number;
    theme: string;
    floorMat: string;
    wallColor: string;
    lightPreset: string;
    isPublic: boolean;
    plotX: number;
    plotZ: number;
    furniture: Array<{ id: string; itemId: string; slotId: string; posX: number; posZ: number; rotation: number; variant: string }>;
    projectWall: Array<{ id: string; repoUrl: string; repoName: string; description: string; slotIndex: number; pinned: boolean }>;
    user: { username: string; avatarUrl: string; displayName: string };
    _count: { visitors: number };
  }) {
    return {
      id: studio.id,
      userId: studio.userId,
      ownerUsername: studio.user.username,
      ownerAvatar: studio.user.avatarUrl,
      ownerDisplayName: studio.user.displayName,
      name: studio.name,
      tier: studio.tier,
      theme: studio.theme,
      floorMat: studio.floorMat,
      wallColor: studio.wallColor,
      lightPreset: studio.lightPreset,
      isPublic: studio.isPublic,
      plotX: studio.plotX,
      plotZ: studio.plotZ,
      furniture: studio.furniture,
      projectWall: studio.projectWall,
      visitorCount: studio._count.visitors,
    };
  }
}
