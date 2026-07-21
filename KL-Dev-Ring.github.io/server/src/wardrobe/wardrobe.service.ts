// ── KL DevVerse — Wardrobe Service ───────────────────────────────────
// Character customization persistence. Manages equipped items per slot.

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { WardrobeSlot } from '@prisma/client';

/** Default wardrobe items given to every new user */
const STARTER_WARDROBE: Array<{ catalogId: string; slot: WardrobeSlot; equipped: boolean }> = [
  { catalogId: 'ward_hair_default',   slot: 'HAIR',  equipped: true },
  { catalogId: 'ward_shirt_default',  slot: 'SHIRT', equipped: true },
  { catalogId: 'ward_pants_default',  slot: 'PANTS', equipped: true },
  { catalogId: 'ward_shoes_default',  slot: 'SHOES', equipped: true },
];

@Injectable()
export class WardrobeService {
  private readonly logger = new Logger(WardrobeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all wardrobe items for a user.
   */
  async getWardrobe(userId: string) {
    return this.prisma.wardrobeItem.findMany({
      where: { userId },
      orderBy: [{ slot: 'asc' }, { acquiredAt: 'desc' }],
    });
  }

  /**
   * Get currently equipped items (one per slot).
   */
  async getEquipped(userId: string): Promise<Record<string, string | null>> {
    const equipped = await this.prisma.wardrobeItem.findMany({
      where: { userId, equipped: true },
    });

    const result: Record<string, string | null> = {
      hair: null, face: null, shirt: null, jacket: null,
      pants: null, shoes: null, backpack: null, accessory: null,
    };

    for (const item of equipped) {
      result[item.slot.toLowerCase()] = item.catalogId;
    }

    return result;
  }

  /**
   * Equip an item in a slot. Unequips the current item in that slot first.
   */
  async equipItem(userId: string, catalogId: string) {
    const item = await this.prisma.wardrobeItem.findUnique({
      where: { userId_catalogId: { userId, catalogId } },
    });

    if (!item) {
      throw new NotFoundException('Item not found in wardrobe');
    }

    // Unequip current item in this slot
    await this.prisma.wardrobeItem.updateMany({
      where: { userId, slot: item.slot, equipped: true },
      data: { equipped: false },
    });

    // Equip the new item
    await this.prisma.wardrobeItem.update({
      where: { id: item.id },
      data: { equipped: true },
    });

    return this.getEquipped(userId);
  }

  /**
   * Unequip an item from a slot (revert to default).
   */
  async unequipSlot(userId: string, slot: WardrobeSlot) {
    await this.prisma.wardrobeItem.updateMany({
      where: { userId, slot, equipped: true },
      data: { equipped: false },
    });

    return this.getEquipped(userId);
  }

  /**
   * Add a wardrobe item (from achievement, purchase, etc.)
   */
  async addItem(userId: string, catalogId: string, slot: WardrobeSlot) {
    return this.prisma.wardrobeItem.upsert({
      where: { userId_catalogId: { userId, catalogId } },
      create: { userId, catalogId, slot },
      update: {},
    });
  }

  /**
   * Provision starter wardrobe for a new user.
   * Idempotent.
   */
  async provisionStarterWardrobe(userId: string) {
    const existing = await this.prisma.wardrobeItem.count({ where: { userId } });
    if (existing > 0) {
      return { provisioned: false };
    }

    const items = STARTER_WARDROBE.map(item => ({
      userId,
      ...item,
    }));

    await this.prisma.wardrobeItem.createMany({ data: items });
    this.logger.log(`Starter wardrobe provisioned for user ${userId}`);

    return { provisioned: true, itemCount: items.length };
  }
}
