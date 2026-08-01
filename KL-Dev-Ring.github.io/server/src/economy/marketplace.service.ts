// ── KL DevVerse — Marketplace Service ────────────────────────────────
// Manages marketplace item queries: filtering, sorting, search, featured.
// Redis-cached for performance.

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import type { ItemCategory, ItemRarity, CurrencyType, Prisma } from '@prisma/client';
import { PricingEngine } from './pricing.engine';

const CACHE_PREFIX = 'marketplace:';
const CATALOG_CACHE_TTL = 300; // 5 minutes
const TRENDING_CACHE_TTL = 60;  // 1 minute

// ── Query Filters ───────────────────────────────────────────────────

export interface MarketplaceFilters {
  category?: ItemCategory;
  rarity?: ItemRarity;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tags?: string[];
  featured?: boolean;
  isLimited?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'rarity' | 'name';
}

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ── Get Items (Paginated + Filtered) ────────────────────────────

  async getItems(filters: MarketplaceFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const limit = Math.min(50, Math.max(1, filters.limit ?? 20));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.MarketplaceItemWhereInput = {};

    if (filters.category) where.category = filters.category;
    if (filters.rarity) where.rarity = filters.rarity;
    if (filters.featured !== undefined) where.featured = filters.featured;
    if (filters.isLimited !== undefined) where.isLimited = filters.isLimited;

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.price = {};
      if (filters.minPrice !== undefined) where.price.gte = filters.minPrice;
      if (filters.maxPrice !== undefined) where.price.lte = filters.maxPrice;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    // Build orderBy
    let orderBy: Prisma.MarketplaceItemOrderByWithRelationInput = { createdAt: 'desc' };
    switch (filters.sortBy) {
      case 'price_asc': orderBy = { price: 'asc' }; break;
      case 'price_desc': orderBy = { price: 'desc' }; break;
      case 'newest': orderBy = { createdAt: 'desc' }; break;
      case 'name': orderBy = { name: 'asc' }; break;
      // rarity sort handled post-query
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.marketplaceItem.findMany({
        where,
        orderBy,
        take: limit,
        skip,
      }),
      this.prisma.marketplaceItem.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Single Item ─────────────────────────────────────────────

  async getItem(id: string) {
    // Try cache
    const cached = await this.redis.get(`${CACHE_PREFIX}item:${id}`);
    if (cached) return JSON.parse(cached);

    const item = await this.prisma.marketplaceItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    await this.redis.set(`${CACHE_PREFIX}item:${id}`, JSON.stringify(item), CATALOG_CACHE_TTL);
    return item;
  }

  // ── Get Featured Items ──────────────────────────────────────────

  async getFeatured() {
    const cached = await this.redis.get(`${CACHE_PREFIX}featured`);
    if (cached) return JSON.parse(cached);

    const items = await this.prisma.marketplaceItem.findMany({
      where: { featured: true },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    await this.redis.set(`${CACHE_PREFIX}featured`, JSON.stringify(items), CATALOG_CACHE_TTL);
    return items;
  }

  // ── Get Trending (Most Purchased Last 7 Days) ───────────────────

  async getTrending() {
    const cached = await this.redis.get(`${CACHE_PREFIX}trending`);
    if (cached) return JSON.parse(cached);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get top purchased items
    const topPurchased = await this.prisma.purchaseHistory.groupBy({
      by: ['marketplaceItemId'],
      where: { purchasedAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 12,
    });

    const itemIds = topPurchased.map(p => p.marketplaceItemId);

    if (itemIds.length === 0) {
      // Fallback to newest items if no purchases yet
      const items = await this.prisma.marketplaceItem.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
      });
      await this.redis.set(`${CACHE_PREFIX}trending`, JSON.stringify(items), TRENDING_CACHE_TTL);
      return items;
    }

    const items = await this.prisma.marketplaceItem.findMany({
      where: { id: { in: itemIds } },
    });

    // Sort by purchase count
    const purchaseCounts = new Map(topPurchased.map(p => [p.marketplaceItemId, p._count.id]));
    items.sort((a, b) => (purchaseCounts.get(b.id) ?? 0) - (purchaseCounts.get(a.id) ?? 0));

    await this.redis.set(`${CACHE_PREFIX}trending`, JSON.stringify(items), TRENDING_CACHE_TTL);
    return items;
  }

  // ── Get Categories with Counts ──────────────────────────────────

  async getCategories() {
    const cached = await this.redis.get(`${CACHE_PREFIX}categories`);
    if (cached) return JSON.parse(cached);

    const groups = await this.prisma.marketplaceItem.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const result = groups.map(g => ({
      category: g.category,
      count: g._count.id,
    }));

    await this.redis.set(`${CACHE_PREFIX}categories`, JSON.stringify(result), CATALOG_CACHE_TTL);
    return result;
  }

  // ── Seed Marketplace (Dev/Init) ─────────────────────────────────

  async seedMarketplace() {
    const count = await this.prisma.marketplaceItem.count();
    if (count > 0) {
      return { seeded: false, message: 'Marketplace already seeded' };
    }

    const items = this.getInitialCatalog();
    await this.prisma.marketplaceItem.createMany({ data: items });

    this.logger.log(`Marketplace seeded with ${items.length} items`);
    return { seeded: true, itemCount: items.length };
  }

  private getInitialCatalog() {
    return [
      // ── Furniture ──
      { catalogId: 'furn_desk_pro',        name: 'Professional Desk',       category: 'FURNITURE' as ItemCategory, rarity: 'UNCOMMON' as ItemRarity, price: 150, tags: ['desk', 'workspace'] },
      { catalogId: 'furn_desk_standing',   name: 'Standing Desk',           category: 'FURNITURE' as ItemCategory, rarity: 'RARE' as ItemRarity,     price: 350, tags: ['desk', 'ergonomic'] },
      { catalogId: 'furn_desk_gaming',     name: 'Gaming Desk RGB',         category: 'FURNITURE' as ItemCategory, rarity: 'EPIC' as ItemRarity,     price: 1200, tags: ['desk', 'gaming'] },
      { catalogId: 'furn_chair_ergo',      name: 'Ergonomic Chair',         category: 'FURNITURE' as ItemCategory, rarity: 'UNCOMMON' as ItemRarity, price: 120, tags: ['chair', 'ergonomic'] },
      { catalogId: 'furn_chair_gaming',    name: 'Gaming Chair',            category: 'FURNITURE' as ItemCategory, rarity: 'RARE' as ItemRarity,     price: 400, tags: ['chair', 'gaming'] },
      { catalogId: 'furn_chair_ceo',       name: 'CEO Executive Chair',     category: 'FURNITURE' as ItemCategory, rarity: 'LEGENDARY' as ItemRarity, price: 3500, tags: ['chair', 'luxury'] },
      { catalogId: 'furn_monitor_ultra',   name: 'Ultrawide Monitor',       category: 'FURNITURE' as ItemCategory, rarity: 'RARE' as ItemRarity,     price: 500, tags: ['monitor', 'tech'] },
      { catalogId: 'furn_monitor_triple',  name: 'Triple Monitor Setup',    category: 'FURNITURE' as ItemCategory, rarity: 'EPIC' as ItemRarity,     price: 1800, tags: ['monitor', 'tech'] },
      { catalogId: 'furn_bookshelf_oak',   name: 'Oak Bookshelf',           category: 'FURNITURE' as ItemCategory, rarity: 'COMMON' as ItemRarity,   price: 50, tags: ['bookshelf', 'wood'] },
      { catalogId: 'furn_bookshelf_glass', name: 'Glass Display Shelf',     category: 'FURNITURE' as ItemCategory, rarity: 'RARE' as ItemRarity,     price: 300, tags: ['bookshelf', 'modern'] },
      { catalogId: 'furn_sofa_modern',     name: 'Modern Lounge Sofa',      category: 'FURNITURE' as ItemCategory, rarity: 'UNCOMMON' as ItemRarity, price: 200, tags: ['sofa', 'lounge'] },
      { catalogId: 'furn_whiteboard',      name: 'Whiteboard',              category: 'FURNITURE' as ItemCategory, rarity: 'COMMON' as ItemRarity,   price: 40, tags: ['whiteboard', 'planning'] },
      { catalogId: 'furn_server_rack',     name: 'Server Rack',             category: 'FURNITURE' as ItemCategory, rarity: 'EPIC' as ItemRarity,     price: 2000, tags: ['server', 'tech'] },
      { catalogId: 'furn_3d_printer',      name: '3D Printer Station',      category: 'FURNITURE' as ItemCategory, rarity: 'EPIC' as ItemRarity,     price: 1500, tags: ['printer', 'maker'] },

      // ── Decorations ──
      { catalogId: 'deco_poster_kerala',   name: 'Kerala Landscape Poster', category: 'DECORATION' as ItemCategory, rarity: 'COMMON' as ItemRarity,   price: 20, tags: ['poster', 'kerala'] },
      { catalogId: 'deco_poster_js',       name: 'JavaScript Poster',       category: 'DECORATION' as ItemCategory, rarity: 'COMMON' as ItemRarity,   price: 15, tags: ['poster', 'code'] },
      { catalogId: 'deco_poster_rust',     name: 'Rust Language Poster',    category: 'DECORATION' as ItemCategory, rarity: 'UNCOMMON' as ItemRarity, price: 60, tags: ['poster', 'code'] },
      { catalogId: 'deco_neon_code',       name: 'Neon Code Sign',          category: 'DECORATION' as ItemCategory, rarity: 'RARE' as ItemRarity,     price: 250, tags: ['neon', 'light'] },
      { catalogId: 'deco_trophy_gold',     name: 'Gold Trophy',             category: 'DECORATION' as ItemCategory, rarity: 'LEGENDARY' as ItemRarity, price: 5000, tags: ['trophy', 'award'] },
      { catalogId: 'deco_plant_bonsai',    name: 'Bonsai Tree',             category: 'DECORATION' as ItemCategory, rarity: 'UNCOMMON' as ItemRarity, price: 80, tags: ['plant', 'nature'] },
      { catalogId: 'deco_plant_monstera',  name: 'Monstera Plant',          category: 'DECORATION' as ItemCategory, rarity: 'COMMON' as ItemRarity,   price: 30, tags: ['plant', 'nature'] },
      { catalogId: 'deco_aquarium',        name: 'Desktop Aquarium',        category: 'DECORATION' as ItemCategory, rarity: 'EPIC' as ItemRarity,     price: 1200, tags: ['aquarium', 'nature'] },
      { catalogId: 'deco_fairy_lights',    name: 'LED Fairy Lights',        category: 'DECORATION' as ItemCategory, rarity: 'COMMON' as ItemRarity,   price: 25, tags: ['light', 'ambient'] },
      { catalogId: 'deco_globe_hologram',  name: 'Holographic Globe',       category: 'DECORATION' as ItemCategory, rarity: 'LEGENDARY' as ItemRarity, price: 4000, tags: ['hologram', 'tech'] },

      // ── Cosmetics ──
      { catalogId: 'cos_hoodie_dev',       name: 'Developer Hoodie',        category: 'COSMETIC' as ItemCategory, rarity: 'COMMON' as ItemRarity,   price: 50, tags: ['clothing', 'casual'] },
      { catalogId: 'cos_hoodie_cyber',     name: 'Cyberpunk Hoodie',        category: 'COSMETIC' as ItemCategory, rarity: 'RARE' as ItemRarity,     price: 350, tags: ['clothing', 'cyber'] },
      { catalogId: 'cos_jacket_leather',   name: 'Leather Jacket',          category: 'COSMETIC' as ItemCategory, rarity: 'UNCOMMON' as ItemRarity, price: 180, tags: ['clothing', 'style'] },
      { catalogId: 'cos_hair_mohawk',      name: 'Neon Mohawk',             category: 'COSMETIC' as ItemCategory, rarity: 'RARE' as ItemRarity,     price: 300, tags: ['hair', 'edgy'] },
      { catalogId: 'cos_hair_long',        name: 'Long Flow Hair',          category: 'COSMETIC' as ItemCategory, rarity: 'UNCOMMON' as ItemRarity, price: 100, tags: ['hair', 'classic'] },
      { catalogId: 'cos_glasses_vr',       name: 'VR Headset',              category: 'COSMETIC' as ItemCategory, rarity: 'EPIC' as ItemRarity,     price: 1500, tags: ['accessory', 'tech'] },
      { catalogId: 'cos_backpack_led',     name: 'LED Backpack',            category: 'COSMETIC' as ItemCategory, rarity: 'RARE' as ItemRarity,     price: 400, tags: ['backpack', 'tech'] },

      // ── Special / Collectibles ──
      { catalogId: 'sp_founder_badge',     name: 'Founder\'s Badge',        category: 'SPECIAL' as ItemCategory, rarity: 'FOUNDER' as ItemRarity,   price: 10000, tags: ['badge', 'exclusive'], featured: true },
      { catalogId: 'sp_onam_lamp',         name: 'Onam Nilavilakku',        category: 'SPECIAL' as ItemCategory, rarity: 'SEASONAL' as ItemRarity,  price: 500, tags: ['onam', 'festival'], isLimited: true },
      { catalogId: 'sp_christmas_star',    name: 'Kerala Christmas Star',   category: 'SPECIAL' as ItemCategory, rarity: 'SEASONAL' as ItemRarity,  price: 400, tags: ['christmas', 'festival'], isLimited: true },
      { catalogId: 'sp_hacktober_shirt',   name: 'Hacktoberfest T-Shirt',   category: 'COLLECTIBLE' as ItemCategory, rarity: 'DEVELOPER_EXCLUSIVE' as ItemRarity, price: 2500, tags: ['hacktoberfest', 'exclusive'], isLimited: true },
      { catalogId: 'sp_100_contrib',       name: '100 Contributions Trophy', category: 'COLLECTIBLE' as ItemCategory, rarity: 'EPIC' as ItemRarity,  price: 0, tags: ['achievement', 'milestone'] },
    ];
  }
}
