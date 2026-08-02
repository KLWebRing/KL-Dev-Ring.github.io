// ── KL DevVerse — Skill Tree Controller ──────────────────────────────
// HTTP endpoints for the skill tree system.

import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SkillTreeService } from './skill-tree.service';

@Controller('gameplay/skills')
@UseGuards(JwtAuthGuard)
export class SkillTreeController {
  constructor(private readonly skillTreeService: SkillTreeService) {}

  /**
   * GET /gameplay/skills
   * Get full skill tree with unlock state.
   */
  @Get()
  async getSkillTree(@Request() req: { user: { sub: string } }) {
    return this.skillTreeService.getSkillTree(req.user.sub);
  }

  /**
   * GET /gameplay/skills/catalog
   * Get the static skill catalog (no auth needed for display).
   */
  @Get('catalog')
  getCatalog() {
    return this.skillTreeService.getCatalog();
  }

  /**
   * POST /gameplay/skills/invest
   * Spend a skill point to unlock a node.
   */
  @Post('invest')
  async investSkillPoint(
    @Request() req: { user: { sub: string } },
    @Body() body: { skillId: string },
  ) {
    return this.skillTreeService.investSkillPoint(req.user.sub, body.skillId);
  }
}
