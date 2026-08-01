// ── KL DevVerse — Career Controller ──────────────────────────────────
// HTTP endpoints for builder career and milestones.

import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CareerService } from './career.service';

@Controller('gameplay/career')
@UseGuards(JwtAuthGuard)
export class CareerController {
  constructor(private readonly careerService: CareerService) {}

  /**
   * GET /gameplay/career
   * Get full career state: rank, milestones, progress toward next rank.
   */
  @Get()
  async getCareer(@Request() req: { user: { sub: string } }) {
    return this.careerService.getCareer(req.user.sub);
  }
}
