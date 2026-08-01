// ── KL DevVerse — Purchase Controller ────────────────────────────────
// HTTP endpoints for purchases.

import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PurchaseService } from './purchase.service';

@Controller('economy/purchase')
@UseGuards(JwtAuthGuard)
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  /**
   * POST /economy/purchase
   * Purchase an item from the marketplace.
   */
  @Post()
  async purchaseItem(
    @Request() req: { user: { sub: string } },
    @Body() body: { marketplaceItemId: string },
  ) {
    return this.purchaseService.purchaseItem(req.user.sub, body.marketplaceItemId);
  }

  /**
   * GET /economy/purchase/history?page=1&limit=20
   * Get purchase history.
   */
  @Get('history')
  async getPurchaseHistory(
    @Request() req: { user: { sub: string } },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.purchaseService.getPurchaseHistory(
      req.user.sub,
      page ? parseInt(page, 10) : 1,
      limit ? Math.min(parseInt(limit, 10), 50) : 20,
    );
  }
}
