// ── KL DevVerse — Leaderboard Controller ─────────────────────────────
// HTTP endpoints for leaderboards.

import { Controller, Get, Query, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';

@Controller('gameplay/leaderboards')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * GET /gameplay/leaderboards/:board?page=1&limit=25
   * Get leaderboard for a specific board type.
   */
  @Get(':board')
  async getLeaderboard(
    @Param('board') board: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.leaderboardService.getLeaderboard(
      board.toUpperCase() as any,
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '25', 10),
    );
  }

  /**
   * GET /gameplay/leaderboards/me/ranks
   * Get current user's rank across all boards.
   */
  @Get('me/ranks')
  async getMyRanks(@Request() req: { user: { sub: string } }) {
    return this.leaderboardService.getUserRanks(req.user.sub);
  }
}
