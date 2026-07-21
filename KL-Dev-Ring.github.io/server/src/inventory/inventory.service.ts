// ── KL DevVerse — Inventory Service ──────────────────────────────────
// Manages item ownership, starter kit provisioning, and category queries.

import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ItemCategory } from '@prisma/client';

/** Starter furniture items given to every new user */
const STARTER_FURNITURE = [
  'furn_desk_basic',
  'furn_chair_basic',
  'furn_monitor_basic',
  'furn_bookshelf_basic',
  'furn_plant_basic',
] as const;

/** Starter decoration */
const STARTER_DECORATIONS = [
  'deco_poster_code',
  'deco_light_fairy',
  'deco_banner_devverse',
] as const;

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all inventory items for a user.
   */
  async getInventory(userId: string) {
    return this.prisma.inventoryItem.findMany({
      where: { userId },
      orderBy: [{ category: 'asc' }, { acquiredAt: 'desc' }],
    });
  }

  /**
   * Get inventory items by category.
   */
  async getByCategory(userId: string, category: ItemCategory) {
    return this.prisma.inventoryItem.findMany({
      where: { userId, category },
      orderBy: { acquiredAt: 'desc' },
    });
  }

  /**
   * Add an item to the user's inventory.
   * If they already own it, increment quantity.
   */
  async addItem(userId: string, catalogId: string, category: ItemCategory, source = 'reward') {
    const existing = await this.prisma.inventoryItem.findUnique({
      where: { userId_catalogId: { userId, catalogId } },
    });

    if (existing) {
      return this.prisma.inventoryItem.update({
        where: { id: existing.id },
        data: { quantity: { increment: 1 } },
      });
    }

    return this.prisma.inventoryItem.create({
      data: { userId, catalogId, category, source },
    });
  }

  /**
   * Check if user owns a specific item.
   */
  async ownsItem(userId: string, catalogId: string): Promise<boolean> {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { userId_catalogId: { userId, catalogId } },
    });
    return item !== null && item.quantity > 0;
  }

  /**
   * Provision starter kit for a new user.
   * Idempotent — safe to call multiple times.
   */
  async provisionStarterKit(userId: string) {
    const existing = await this.prisma.inventoryItem.count({ where: { userId } });
    if (existing > 0) {
      return { provisioned: false, message: 'Starter kit already provisioned' };
    }

    const items = [
      ...STARTER_FURNITURE.map(id => ({
        userId,
        catalogId: id,
        category: 'FURNITURE' as ItemCategory,
        source: 'starter',
      })),
      ...STARTER_DECORATIONS.map(id => ({
        userId,
        catalogId: id,
        category: 'DECORATION' as ItemCategory,
        source: 'starter',
      })),
    ];

    await this.prisma.inventoryItem.createMany({ data: items });
    this.logger.log(`Starter kit provisioned for user ${userId}: ${items.length} items`);

    return { provisioned: true, itemCount: items.length };
  }

  /**
   * Get inventory summary (count per category).
   */
  async getSummary(userId: string) {
    const items = await this.prisma.inventoryItem.groupBy({
      by: ['category'],
      where: { userId },
      _count: true,
      _sum: { quantity: true },
    });

    return items.map(g => ({
      category: g.category,
      uniqueItems: g._count,
      totalQuantity: g._sum.quantity ?? 0,
    }));
  }
}
