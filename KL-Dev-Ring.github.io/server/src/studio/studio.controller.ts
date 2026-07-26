// ── KL DevVerse — Builder Studio Controller ─────────────────────────
import { Controller, Get, Put, Post, Delete, Body, Req, Param, Query, HttpCode } from '@nestjs/common';
import { StudioService } from './studio.service';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('api/studio')
export class StudioController {
  constructor(private readonly studioService: StudioService) {}

  // ── My Studio ────────────────────────────────────────────────────

  /** GET /api/studio/mine — Get or create my Builder Studio */
  @Get('mine')
  async getMyStudio(@Req() req: AuthRequest) {
    return this.studioService.getOrCreateStudio(req.user.userId);
  }

  /** PUT /api/studio/mine — Update studio settings */
  @Put('mine')
  async updateMyStudio(
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
    return this.studioService.updateStudio(req.user.userId, body);
  }

  // ── Visit ────────────────────────────────────────────────────────

  /** GET /api/studio/user/:userId — Get a user's studio (for visiting) */
  @Get('user/:userId')
  async getUserStudio(@Param('userId') userId: string) {
    return this.studioService.getStudioByUserId(userId);
  }

  /** POST /api/studio/:studioId/visit — Record a visit */
  @Post(':studioId/visit')
  @HttpCode(200)
  async recordVisit(
    @Param('studioId') studioId: string,
    @Req() req: AuthRequest,
  ) {
    return this.studioService.recordVisit(studioId, req.user.userId);
  }

  /** GET /api/studio/:studioId/visitors — Get recent visitors */
  @Get(':studioId/visitors')
  async getVisitors(
    @Param('studioId') studioId: string,
    @Query('limit') limit?: string,
  ) {
    return this.studioService.getRecentVisitors(studioId, limit ? parseInt(limit, 10) : 20);
  }

  // ── Furniture ────────────────────────────────────────────────────

  /** POST /api/studio/furniture — Place furniture */
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
    return this.studioService.placeFurniture(req.user.userId, body);
  }

  /** DELETE /api/studio/furniture/:id — Remove furniture */
  @Delete('furniture/:id')
  async removeFurniture(
    @Req() req: AuthRequest,
    @Param('id') furnitureId: string,
  ) {
    return this.studioService.removeFurniture(req.user.userId, furnitureId);
  }

  // ── Project Wall ─────────────────────────────────────────────────

  /** POST /api/studio/projects — Pin a project */
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
    return this.studioService.pinProject(req.user.userId, body);
  }

  /** DELETE /api/studio/projects/:slotIndex — Unpin a project */
  @Delete('projects/:slotIndex')
  async unpinProject(
    @Req() req: AuthRequest,
    @Param('slotIndex') slotIndex: string,
  ) {
    return this.studioService.unpinProject(req.user.userId, parseInt(slotIndex, 10));
  }
}
