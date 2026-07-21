// ── KL DevVerse — House Controller ───────────────────────────────────
import { Controller, Get, Put, Post, Delete, Body, Req, Param, Query, HttpCode } from '@nestjs/common';
import { HouseService } from './house.service';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('api/house')
export class HouseController {
  constructor(private readonly houseService: HouseService) {}

  // ── My House ─────────────────────────────────────────────────────

  /** GET /api/house/mine — Get or create my house */
  @Get('mine')
  async getMyHouse(@Req() req: AuthRequest) {
    return this.houseService.getOrCreateHouse(req.user.userId);
  }

  /** PUT /api/house/mine — Update house settings */
  @Put('mine')
  async updateMyHouse(
    @Req() req: AuthRequest,
    @Body() body: {
      name?: string;
      theme?: string;
      floorMat?: string;
      wallColor?: string;
      lightPreset?: string;
      isPublic?: boolean;
    },
  ) {
    return this.houseService.updateHouse(req.user.userId, body);
  }

  // ── Visit ────────────────────────────────────────────────────────

  /** GET /api/house/user/:userId — Get a user's house (for visiting) */
  @Get('user/:userId')
  async getUserHouse(@Param('userId') userId: string) {
    return this.houseService.getHouseByUserId(userId);
  }

  /** POST /api/house/:houseId/visit — Record a visit */
  @Post(':houseId/visit')
  @HttpCode(200)
  async recordVisit(
    @Param('houseId') houseId: string,
    @Req() req: AuthRequest,
  ) {
    return this.houseService.recordVisit(houseId, req.user.userId);
  }

  /** GET /api/house/:houseId/visitors — Get recent visitors */
  @Get(':houseId/visitors')
  async getVisitors(
    @Param('houseId') houseId: string,
    @Query('limit') limit?: string,
  ) {
    return this.houseService.getRecentVisitors(houseId, limit ? parseInt(limit, 10) : 20);
  }

  // ── Furniture ────────────────────────────────────────────────────

  /** POST /api/house/furniture — Place furniture */
  @Post('furniture')
  async placeFurniture(
    @Req() req: AuthRequest,
    @Body() body: {
      itemId: string;
      slotId: string;
      posX?: number;
      posZ?: number;
      rotation?: number;
      variant?: string;
    },
  ) {
    return this.houseService.placeFurniture(req.user.userId, body);
  }

  /** DELETE /api/house/furniture/:id — Remove furniture */
  @Delete('furniture/:id')
  async removeFurniture(
    @Req() req: AuthRequest,
    @Param('id') furnitureId: string,
  ) {
    return this.houseService.removeFurniture(req.user.userId, furnitureId);
  }

  // ── Project Wall ─────────────────────────────────────────────────

  /** POST /api/house/projects — Pin a project */
  @Post('projects')
  async pinProject(
    @Req() req: AuthRequest,
    @Body() body: {
      repoUrl: string;
      repoName: string;
      description: string;
      slotIndex: number;
    },
  ) {
    return this.houseService.pinProject(req.user.userId, body);
  }

  /** DELETE /api/house/projects/:slotIndex — Unpin a project */
  @Delete('projects/:slotIndex')
  async unpinProject(
    @Req() req: AuthRequest,
    @Param('slotIndex') slotIndex: string,
  ) {
    return this.houseService.unpinProject(req.user.userId, parseInt(slotIndex, 10));
  }
}
