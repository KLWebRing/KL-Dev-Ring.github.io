// ── KL DevVerse — Activity Controller ────────────────────────────────
// HTTP endpoints for activity logging and summaries.

import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityService } from './activity.service';
import type { ActionType } from '@prisma/client';

@Controller('gameplay/activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * POST /gameplay/activity/log
   * Log an activity (auto-triggers quest progress).
   */
  @Post('log')
  async logActivity(
    @Request() req: { user: { sub: string } },
    @Body() body: { action: ActionType; metadata?: Record<string, unknown> },
  ) {
    return this.activityService.logActivity(req.user.sub, body.action, body.metadata);
  }

  /**
   * GET /gameplay/activity/summary
   * Get activity summary with breakdown.
   */
  @Get('summary')
  async getSummary(@Request() req: { user: { sub: string } }) {
    return this.activityService.getActivitySummary(req.user.sub);
  }

  /**
   * GET /gameplay/activity/recent?limit=20
   * Get recent activity entries.
   */
  @Get('recent')
  async getRecent(
    @Request() req: { user: { sub: string } },
    @Query('limit') limit?: string,
  ) {
    return this.activityService.getRecentActivity(req.user.sub, parseInt(limit ?? '20', 10));
  }
}
