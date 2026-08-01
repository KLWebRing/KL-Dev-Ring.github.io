// ── KL DevVerse — Quest Controller ───────────────────────────────────
// HTTP endpoints for daily/weekly quests.

import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QuestService } from './quest.service';

@Controller('gameplay/quests')
@UseGuards(JwtAuthGuard)
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  /**
   * GET /gameplay/quests
   * Get all active daily and weekly quests for the user.
   * Auto-generates new ones if missing/expired.
   */
  @Get()
  async getQuests(@Request() req: { user: { sub: string } }) {
    return this.questService.getQuests(req.user.sub);
  }

  /**
   * POST /gameplay/quests/track
   * Track an action to progress matching quests.
   */
  @Post('track')
  async trackAction(
    @Request() req: { user: { sub: string } },
    @Body() body: { action: string; count?: number },
  ) {
    return this.questService.trackAction(req.user.sub, body.action, body.count ?? 1);
  }

  /**
   * POST /gameplay/quests/:id/claim
   * Claim reward for a completed quest.
   */
  @Post(':id/claim')
  async claimReward(@Request() req: { user: { sub: string } }, @Param('id') id: string) {
    return this.questService.claimReward(req.user.sub, id);
  }
}
