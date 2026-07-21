// ── KL DevVerse — Builder Controller ─────────────────────────────────
// REST API for builder progression.

import { Controller, Get, Post, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { BuilderService } from './builder.service';

// Placeholder guard — uses the JWT guard from auth module
// In production, import { JwtAuthGuard } from '../auth/jwt-auth.guard';
interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('api/builder')
export class BuilderController {
  constructor(private readonly builderService: BuilderService) {}

  /**
   * GET /api/builder/progress
   * Returns the current user's builder progress.
   */
  @Get('progress')
  async getProgress(@Req() req: AuthRequest) {
    return this.builderService.getFormattedProgress(req.user.userId);
  }

  /**
   * POST /api/builder/award-xp
   * Awards XP from a specific source. (Admin/system use)
   */
  @Post('award-xp')
  @HttpCode(200)
  async awardXp(
    @Req() req: AuthRequest,
    @Body() body: { amount: number; source: 'github' | 'social' | 'exploring' | 'building' },
  ) {
    return this.builderService.awardXp(req.user.userId, body.amount, body.source);
  }
}
