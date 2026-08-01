// ── KL DevVerse — Mission Controller ─────────────────────────────────
// HTTP endpoints for missions.

import { Controller, Get, Post, Param, UseGuards, Request, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MissionService } from './mission.service';

@Controller('gameplay/missions')
@UseGuards(JwtAuthGuard)
export class MissionController {
  constructor(private readonly missionService: MissionService) {}

  /**
   * GET /gameplay/missions
   * Get all active and available missions for the user.
   */
  @Get()
  async getMissions(@Request() req: { user: { sub: string } }) {
    return this.missionService.getMissions(req.user.sub);
  }

  /**
   * POST /gameplay/missions/:id/start
   * Start a mission.
   */
  @Post(':id/start')
  async startMission(@Request() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.missionService.startMission(req.user.sub, id);
  }

  /**
   * POST /gameplay/missions/:id/progress
   * Update mission progress.
   */
  @Post(':id/progress')
  async updateProgress(
    @Request() req: { user: { sub: string } }, 
    @Param('id') id: string,
    @Body() body: { increment?: number }
  ) {
    return this.missionService.updateProgress(req.user.sub, id, body.increment ?? 1);
  }

  /**
   * POST /gameplay/missions/:id/claim
   * Claim reward for a completed mission.
   */
  @Post(':id/claim')
  async claimReward(@Request() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.missionService.claimReward(req.user.sub, id);
  }
}
