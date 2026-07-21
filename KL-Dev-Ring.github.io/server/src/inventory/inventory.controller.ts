// ── KL DevVerse — Inventory Controller ───────────────────────────────
import { Controller, Get, Post, Body, Req, Query, HttpCode } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import type { ItemCategory } from '@prisma/client';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('api/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /** GET /api/inventory — Get all items */
  @Get()
  async getAll(@Req() req: AuthRequest) {
    return this.inventoryService.getInventory(req.user.userId);
  }

  /** GET /api/inventory/summary — Get category summary */
  @Get('summary')
  async getSummary(@Req() req: AuthRequest) {
    return this.inventoryService.getSummary(req.user.userId);
  }

  /** GET /api/inventory/category?type=FURNITURE — Filter by category */
  @Get('category')
  async getByCategory(
    @Req() req: AuthRequest,
    @Query('type') type: ItemCategory,
  ) {
    return this.inventoryService.getByCategory(req.user.userId, type);
  }

  /** POST /api/inventory/provision — Provision starter kit */
  @Post('provision')
  @HttpCode(200)
  async provision(@Req() req: AuthRequest) {
    return this.inventoryService.provisionStarterKit(req.user.userId);
  }
}
