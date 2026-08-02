// ── KL DevVerse — Timeline Controller ────────────────────────────────
// HTTP endpoints for builder timeline.

import { Controller, Get, Query, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TimelineService } from './timeline.service';

@Controller('gameplay/timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  /**
   * GET /gameplay/timeline
   * Get own timeline (includes private entries).
   */
  @Get()
  async getTimeline(
    @Request() req: { user: { sub: string } },
    @Query('page') page?: string,
  ) {
    return this.timelineService.getTimeline(req.user.sub, parseInt(page ?? '1', 10));
  }

  /**
   * GET /gameplay/timeline/stats
   * Get timeline stats breakdown.
   */
  @Get('stats')
  async getStats(@Request() req: { user: { sub: string } }) {
    return this.timelineService.getStats(req.user.sub);
  }

  /**
   * GET /gameplay/timeline/user/:userId
   * Get public timeline for another user.
   */
  @Get('user/:userId')
  async getPublicTimeline(
    @Param('userId') userId: string,
    @Query('page') page?: string,
  ) {
    return this.timelineService.getPublicTimeline(userId, parseInt(page ?? '1', 10));
  }
}
