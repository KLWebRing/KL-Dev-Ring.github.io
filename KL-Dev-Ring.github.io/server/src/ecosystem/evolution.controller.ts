// ── KL DevVerse — Evolution Controller ───────────────────────────────
// HTTP endpoints for studio evolution system.

import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EvolutionService } from './evolution.service';

@Controller('ecosystem/evolution')
@UseGuards(JwtAuthGuard)
export class EvolutionController {
  constructor(private readonly evolutionService: EvolutionService) {}

  /**
   * GET /ecosystem/evolution
   * Get current evolution state with stage metadata.
   */
  @Get()
  async getEvolution(@Request() req: { user: { sub: string } }) {
    return this.evolutionService.getEvolutionState(req.user.sub);
  }

  /**
   * GET /ecosystem/evolution/catalog
   * Get the full evolution stage catalog.
   */
  @Get('catalog')
  getCatalog() {
    return this.evolutionService.getCatalog();
  }

  /**
   * POST /ecosystem/evolution/recompute
   * Force recompute evolution (debug/admin).
   */
  @Post('recompute')
  async recompute(@Request() req: { user: { sub: string } }) {
    return this.evolutionService.computeEvolution(req.user.sub);
  }
}
