// ── KL DevVerse — Builder Twin Controller ────────────────────────────
// HTTP endpoints for AI Builder Twin.

import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BuilderTwinService } from './builder-twin.service';

@Controller('ecosystem/twin')
@UseGuards(JwtAuthGuard)
export class BuilderTwinController {
  constructor(private readonly twinService: BuilderTwinService) {}

  /** GET /ecosystem/twin/config — get own twin configuration. */
  @Get('config')
  async getConfig(@Request() req: { user: { sub: string } }) {
    return this.twinService.getTwinConfig(req.user.sub);
  }

  /** PUT /ecosystem/twin/config — update own twin configuration. */
  @Put('config')
  async updateConfig(
    @Request() req: { user: { sub: string } },
    @Body() body: { isActive?: boolean; greeting?: string; personality?: Record<string, unknown> },
  ) {
    return this.twinService.updateTwinConfig(req.user.sub, body);
  }

  /** POST /ecosystem/twin/:userId/ask — ask another builder's twin a question. */
  @Post(':userId/ask')
  async askTwin(
    @Request() req: { user: { sub: string } },
    @Param('userId') userId: string,
    @Body() body: { question: string },
  ) {
    return this.twinService.askTwin(userId, req.user.sub, body.question);
  }

  /** GET /ecosystem/twin/conversations — get recent conversations with own twin. */
  @Get('conversations')
  async getConversations(
    @Request() req: { user: { sub: string } },
    @Query('limit') limit?: string,
  ) {
    return this.twinService.getRecentConversations(req.user.sub, limit ? parseInt(limit, 10) : 20);
  }
}
