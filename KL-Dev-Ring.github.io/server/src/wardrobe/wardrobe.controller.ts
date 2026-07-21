// ── KL DevVerse — Wardrobe Controller ────────────────────────────────
import { Controller, Get, Post, Put, Body, Req, Param, HttpCode } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import type { WardrobeSlot } from '@prisma/client';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('api/wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  /** GET /api/wardrobe — All owned wardrobe items */
  @Get()
  async getAll(@Req() req: AuthRequest) {
    return this.wardrobeService.getWardrobe(req.user.userId);
  }

  /** GET /api/wardrobe/equipped — Currently equipped outfit */
  @Get('equipped')
  async getEquipped(@Req() req: AuthRequest) {
    return this.wardrobeService.getEquipped(req.user.userId);
  }

  /** GET /api/wardrobe/user/:userId/equipped — Another user's outfit */
  @Get('user/:userId/equipped')
  async getUserEquipped(@Param('userId') userId: string) {
    return this.wardrobeService.getEquipped(userId);
  }

  /** PUT /api/wardrobe/equip — Equip an item */
  @Put('equip')
  async equip(
    @Req() req: AuthRequest,
    @Body() body: { catalogId: string },
  ) {
    return this.wardrobeService.equipItem(req.user.userId, body.catalogId);
  }

  /** PUT /api/wardrobe/unequip — Unequip a slot */
  @Put('unequip')
  async unequip(
    @Req() req: AuthRequest,
    @Body() body: { slot: WardrobeSlot },
  ) {
    return this.wardrobeService.unequipSlot(req.user.userId, body.slot);
  }

  /** POST /api/wardrobe/provision — Provision starter wardrobe */
  @Post('provision')
  @HttpCode(200)
  async provision(@Req() req: AuthRequest) {
    return this.wardrobeService.provisionStarterWardrobe(req.user.userId);
  }
}
