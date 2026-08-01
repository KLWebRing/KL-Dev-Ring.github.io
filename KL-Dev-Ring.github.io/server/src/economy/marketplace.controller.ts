// ── KL DevVerse — Marketplace Controller ─────────────────────────────
// HTTP endpoints for marketplace browsing.
// All routes require authentication.

import { Controller, Get, Param, Query, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MarketplaceService, type MarketplaceFilters } from './marketplace.service';
import type { ItemCategory, ItemRarity } from '@prisma/client';

@Controller('economy/marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  /**
   * GET /economy/marketplace
   * Paginated, filterable item list.
   */
  @Get()
  async getItems(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('rarity') rarity?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('featured') featured?: string,
    @Query('isLimited') isLimited?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const filters: MarketplaceFilters = {};

    if (page) filters.page = parseInt(page, 10);
    if (limit) filters.limit = parseInt(limit, 10);
    if (category) filters.category = category as ItemCategory;
    if (rarity) filters.rarity = rarity as ItemRarity;
    if (minPrice) filters.minPrice = parseInt(minPrice, 10);
    if (maxPrice) filters.maxPrice = parseInt(maxPrice, 10);
    if (search) filters.search = search;
    if (tags) filters.tags = tags.split(',');
    if (featured === 'true') filters.featured = true;
    if (isLimited === 'true') filters.isLimited = true;
    if (sortBy) filters.sortBy = sortBy as MarketplaceFilters['sortBy'];

    return this.marketplaceService.getItems(filters);
  }

  /**
   * GET /economy/marketplace/featured
   * Curated featured items.
   */
  @Get('featured')
  async getFeatured() {
    return this.marketplaceService.getFeatured();
  }

  /**
   * GET /economy/marketplace/trending
   * Most purchased in last 7 days.
   */
  @Get('trending')
  async getTrending() {
    return this.marketplaceService.getTrending();
  }

  /**
   * GET /economy/marketplace/categories
   * All categories with item counts.
   */
  @Get('categories')
  async getCategories() {
    return this.marketplaceService.getCategories();
  }

  /**
   * POST /economy/marketplace/seed
   * Seed marketplace with initial catalog (dev only).
   */
  @Post('seed')
  async seedMarketplace() {
    return this.marketplaceService.seedMarketplace();
  }

  /**
   * GET /economy/marketplace/:id
   * Single item detail.
   */
  @Get(':id')
  async getItem(@Param('id') id: string) {
    return this.marketplaceService.getItem(id);
  }
}
