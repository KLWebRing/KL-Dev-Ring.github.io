// ── KL DevVerse — Builder DNA Controller ─────────────────────────────
// HTTP endpoints for builder DNA system.

import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuilderDNAService } from './builder-dna.service';

@Controller('ecosystem/dna')
@UseGuards(JwtAuthGuard)
export class BuilderDNAController {
  constructor(private readonly dnaService: BuilderDNAService) {}

  /** GET /ecosystem/dna — get current DNA profile. */
  @Get()
  async getDNA(@Request() req: { user: { sub: string } }) {
    return this.dnaService.getDNA(req.user.sub);
  }

  /** POST /ecosystem/dna/recompute — force recompute. */
  @Post('recompute')
  async recompute(@Request() req: { user: { sub: string } }) {
    return this.dnaService.computeDNA(req.user.sub);
  }
}
