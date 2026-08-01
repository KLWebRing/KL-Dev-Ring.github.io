// ── KL DevVerse — Studio Upgrade Controller ──────────────────────────
// HTTP endpoints for studio tier upgrades.

import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StudioUpgradeService } from './studio-upgrade.service';

@Controller('economy/studio-upgrade')
@UseGuards(JwtAuthGuard)
export class StudioUpgradeController {
  constructor(private readonly studioUpgradeService: StudioUpgradeService) {}

  /**
   * GET /economy/studio-upgrade
   * Get current tier info and upgrade requirements.
   */
  @Get()
  async getUpgradeInfo(@Request() req: { user: { sub: string } }) {
    return this.studioUpgradeService.getUpgradeInfo(req.user.sub);
  }

  /**
   * POST /economy/studio-upgrade
   * Upgrade studio to next tier.
   */
  @Post()
  async upgradeStudio(@Request() req: { user: { sub: string } }) {
    return this.studioUpgradeService.upgradeStudio(req.user.sub);
  }
}
