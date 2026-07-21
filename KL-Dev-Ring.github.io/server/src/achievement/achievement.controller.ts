// ── KL DevVerse — Achievement Controller ─────────────────────────────
import { Controller, Get, Post, Body, Req, Param, HttpCode } from '@nestjs/common';
import { AchievementService } from './achievement.service';

interface AuthRequest extends Request {
  user: { userId: string };
}

@Controller('api/achievements')
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  /**
   * GET /api/achievements
   * Returns all achievements for the current user.
   */
  @Get()
  async getAll(@Req() req: AuthRequest) {
    return this.achievementService.getUserAchievements(req.user.userId);
  }

  /**
   * GET /api/achievements/stats
   * Returns achievement summary (total, unlocked, in-progress, locked).
   */
  @Get('stats')
  async getStats(@Req() req: AuthRequest) {
    return this.achievementService.getStats(req.user.userId);
  }

  /**
   * GET /api/achievements/user/:userId
   * Returns achievements for a specific user (for viewing profiles).
   */
  @Get('user/:userId')
  async getUserAchievements(@Param('userId') userId: string) {
    return this.achievementService.getUserAchievements(userId);
  }

  /**
   * POST /api/achievements/unlock
   * Manually unlock an achievement (system/admin use).
   */
  @Post('unlock')
  @HttpCode(200)
  async unlock(
    @Req() req: AuthRequest,
    @Body() body: { achieveId: string },
  ) {
    return this.achievementService.unlock(req.user.userId, body.achieveId);
  }
}
