// ── KL DevVerse — Reputation Controller ──────────────────────────────
// HTTP endpoints for reputation system.

import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReputationService } from './reputation.service';

@Controller('gameplay/reputation')
@UseGuards(JwtAuthGuard)
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  /**
   * GET /gameplay/reputation/summary
   * Get reputation summary with source breakdown.
   */
  @Get('summary')
  async getSummary(@Request() req: { user: { sub: string } }) {
    return this.reputationService.getSummary(req.user.sub);
  }

  /**
   * GET /gameplay/reputation/history?page=1
   * Get paginated reputation history.
   */
  @Get('history')
  async getHistory(
    @Request() req: { user: { sub: string } },
    @Query('page') page?: string,
  ) {
    return this.reputationService.getHistory(req.user.sub, parseInt(page ?? '1', 10));
  }

  /**
   * GET /gameplay/reputation/top
   * Get top reputation holders.
   */
  @Get('top')
  async getTopContributors(@Query('limit') limit?: string) {
    return this.reputationService.getTopContributors(parseInt(limit ?? '25', 10));
  }
}
