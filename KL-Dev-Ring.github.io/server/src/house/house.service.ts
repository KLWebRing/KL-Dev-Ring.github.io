// ── KL DevVerse — House Service ──────────────────────────────────────
// Manages house CRUD, furniture placement, visitor tracking, project walls.

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HouseService {
  private readonly logger = new Logger(HouseService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── House CRUD ──────────────────────────────────────────────────────

  /**
   * Get or create a house for a user.
   * Every authenticated user automatically gets a house.
   */
  async getOrCreateHouse(userId: string) {
    const existing = await this.prisma.house.findUnique({
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
      return this.formatHouse(existing);
    }

    // Auto-create with defaults
    const house = await this.prisma.house.create({
      data: { userId },
      include: {
        furniture: true,
        decorations: true,
        projectWall: { orderBy: { slotIndex: 'asc' } },
        user: { select: { username: true, avatarUrl: true, displayName: true } },
        _count: { select: { visitors: true } },
      },
    });

    this.logger.log(`House auto-created for user ${userId}`);
    return this.formatHouse(house);
  }

  /**
   * Get a house by user ID (for visiting).
   */
  async getHouseByUserId(userId: string) {
    const house = await this.prisma.house.findUnique({
      where: { userId },
      include: {
        furniture: true,
        decorations: true,
        projectWall: { orderBy: { slotIndex: 'asc' } },
        user: { select: { username: true, avatarUrl: true, displayName: true } },
        _count: { select: { visitors: true } },
      },
    });

    if (!house) {
      throw new NotFoundException('House not found');
    }

    return this.formatHouse(house);
  }

  /**
   * Update house settings (theme, name, colors).
   */
  async updateHouse(userId: string, data: {
    name?: string;
    theme?: string;
    floorMat?: string;
    wallColor?: string;
    lightPreset?: string;
    isPublic?: boolean;
  }) {
    const house = await this.prisma.house.findUnique({ where: { userId } });
    if (!house) throw new NotFoundException('House not found');

    return this.prisma.house.update({
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
    const house = await this.prisma.house.findUnique({ where: { userId } });
    if (!house) throw new NotFoundException('House not found');

    // Upsert — replace if slot already occupied
    return this.prisma.placedFurniture.upsert({
      where: {
        id: `${house.id}_${data.slotId}`, // Not a real unique, need different approach
      },
      create: {
        houseId: house.id,
        itemId: data.itemId,
        slotId: data.slotId,
        posX: data.posX ?? 0,
        posZ: data.posZ ?? 0,
        rotation: data.rotation ?? 0,
        variant: data.variant ?? 'default',
      },
      update: {
        itemId: data.itemId,
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
    const house = await this.prisma.house.findUnique({ where: { userId } });
    if (!house) throw new NotFoundException('House not found');

    const furniture = await this.prisma.placedFurniture.findUnique({
      where: { id: furnitureId },
    });

    if (!furniture || furniture.houseId !== house.id) {
      throw new ForbiddenException('Cannot remove furniture from another house');
    }

    return this.prisma.placedFurniture.delete({ where: { id: furnitureId } });
  }

  // ── Visitors ────────────────────────────────────────────────────────

  /**
   * Record a house visit.
   */
  async recordVisit(houseId: string, visitorId: string) {
    return this.prisma.houseVisit.create({
      data: { houseId, visitorId },
    });
  }

  /**
   * Get recent visitors for a house.
   */
  async getRecentVisitors(houseId: string, limit = 20) {
    return this.prisma.houseVisit.findMany({
      where: { houseId },
      orderBy: { visitedAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get visitor count for a house.
   */
  async getVisitorCount(houseId: string): Promise<number> {
    return this.prisma.houseVisit.count({ where: { houseId } });
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
    const house = await this.prisma.house.findUnique({ where: { userId } });
    if (!house) throw new NotFoundException('House not found');

    if (data.slotIndex < 0 || data.slotIndex > 5) {
      throw new ForbiddenException('Slot index must be 0-5');
    }

    return this.prisma.projectDisplay.upsert({
      where: {
        houseId_slotIndex: { houseId: house.id, slotIndex: data.slotIndex },
      },
      create: {
        houseId: house.id,
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
    const house = await this.prisma.house.findUnique({ where: { userId } });
    if (!house) throw new NotFoundException('House not found');

    return this.prisma.projectDisplay.deleteMany({
      where: { houseId: house.id, slotIndex },
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────

  private formatHouse(house: {
    id: string;
    userId: string;
    name: string;
    level: number;
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
      id: house.id,
      userId: house.userId,
      ownerUsername: house.user.username,
      ownerAvatar: house.user.avatarUrl,
      ownerDisplayName: house.user.displayName,
      name: house.name,
      level: house.level,
      theme: house.theme,
      floorMat: house.floorMat,
      wallColor: house.wallColor,
      lightPreset: house.lightPreset,
      isPublic: house.isPublic,
      plotX: house.plotX,
      plotZ: house.plotZ,
      furniture: house.furniture,
      projectWall: house.projectWall,
      visitorCount: house._count.visitors,
    };
  }
}
