// ── KL DevVerse — Project Portal Controller ──────────────────────────
// HTTP endpoints for project portals.

import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectPortalService } from './project-portal.service';

@Controller('ecosystem/portals')
@UseGuards(JwtAuthGuard)
export class ProjectPortalController {
  constructor(private readonly portalService: ProjectPortalService) {}

  /** GET /ecosystem/portals — get all portals for current user's studio. */
  @Get()
  async getStudioPortals(@Request() req: { user: { sub: string } }) {
    return this.portalService.getStudioPortals(req.user.sub);
  }

  /** GET /ecosystem/portals/:displayId — get or create portal for a project display. */
  @Get(':displayId')
  async getPortal(@Param('displayId') displayId: string) {
    return this.portalService.getOrCreatePortal(displayId);
  }

  /** PUT /ecosystem/portals/:portalId — update portal metadata. */
  @Put(':portalId')
  async updatePortal(
    @Request() req: { user: { sub: string } },
    @Param('portalId') portalId: string,
    @Body() body: {
      techStack?: string[];
      livePreviewUrl?: string;
      demoUrl?: string;
      architectureNotes?: string;
      readme?: string;
    },
  ) {
    return this.portalService.updatePortal(portalId, req.user.sub, body);
  }

  /** POST /ecosystem/portals/:portalId/versions — add a version. */
  @Post(':portalId/versions')
  async addVersion(
    @Request() req: { user: { sub: string } },
    @Param('portalId') portalId: string,
    @Body() body: { version: string; changelog?: string; snapshotUrl?: string },
  ) {
    return this.portalService.addVersion(portalId, req.user.sub, body);
  }

  /** GET /ecosystem/portals/:portalId/versions — get version history. */
  @Get(':portalId/versions')
  async getVersions(@Param('portalId') portalId: string) {
    return this.portalService.getVersionHistory(portalId);
  }
}
