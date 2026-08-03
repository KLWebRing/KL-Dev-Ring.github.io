// ── KL DevVerse — Project Portal Service ─────────────────────────────
// Projects become interactive portals inside studios.
// Manages portal metadata, tech stack, live previews, and version history.

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectPortalService {
  private readonly logger = new Logger(ProjectPortalService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create or get a portal for a project display.
   */
  async getOrCreatePortal(projectDisplayId: string) {
    const display = await this.prisma.projectDisplay.findUnique({
      where: { id: projectDisplayId },
      include: { portal: { include: { versions: { orderBy: { createdAt: 'desc' } } } } },
    });

    if (!display) throw new NotFoundException('Project display not found');

    if (display.portal) {
      return this.formatPortal(display.portal, display);
    }

    // Auto-create portal
    const portal = await this.prisma.projectPortal.create({
      data: { projectDisplayId },
      include: { versions: true },
    });

    this.logger.log(`Portal created for project display ${projectDisplayId}`);
    return this.formatPortal(portal, display);
  }

  /**
   * Get all portals for a user's studio.
   */
  async getStudioPortals(userId: string) {
    const displays = await this.prisma.projectDisplay.findMany({
      where: { studio: { userId } },
      include: {
        portal: {
          include: { versions: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
      orderBy: { slotIndex: 'asc' },
    });

    return displays.map(d => ({
      displayId: d.id,
      repoName: d.repoName,
      repoUrl: d.repoUrl,
      description: d.description,
      slotIndex: d.slotIndex,
      hasPortal: !!d.portal,
      portal: d.portal ? {
        id: d.portal.id,
        techStack: d.portal.techStack,
        stars: d.portal.stars,
        forks: d.portal.forks,
        livePreviewUrl: d.portal.livePreviewUrl,
        latestVersion: d.portal.versions[0]?.version ?? null,
      } : null,
    }));
  }

  /**
   * Update portal metadata.
   */
  async updatePortal(portalId: string, userId: string, data: {
    techStack?: string[];
    livePreviewUrl?: string;
    demoUrl?: string;
    architectureNotes?: string;
    readme?: string;
  }) {
    // Verify ownership
    const portal = await this.prisma.projectPortal.findUnique({
      where: { id: portalId },
      include: { projectDisplay: { include: { studio: true } } },
    });

    if (!portal) throw new NotFoundException('Portal not found');
    if (portal.projectDisplay.studio.userId !== userId) {
      throw new BadRequestException('Not your portal');
    }

    return this.prisma.projectPortal.update({
      where: { id: portalId },
      data: {
        techStack: data.techStack,
        livePreviewUrl: data.livePreviewUrl,
        demoUrl: data.demoUrl,
        architectureNotes: data.architectureNotes,
        readme: data.readme,
      },
    });
  }

  /**
   * Add a version to the project portal.
   */
  async addVersion(portalId: string, userId: string, data: {
    version: string;
    changelog?: string;
    snapshotUrl?: string;
  }) {
    // Verify ownership
    const portal = await this.prisma.projectPortal.findUnique({
      where: { id: portalId },
      include: { projectDisplay: { include: { studio: true } } },
    });

    if (!portal) throw new NotFoundException('Portal not found');
    if (portal.projectDisplay.studio.userId !== userId) {
      throw new BadRequestException('Not your portal');
    }

    const version = await this.prisma.projectVersion.create({
      data: {
        portalId,
        version: data.version,
        changelog: data.changelog ?? '',
        snapshotUrl: data.snapshotUrl,
      },
    });

    this.logger.log(`Version ${data.version} added to portal ${portalId}`);
    return version;
  }

  /**
   * Get version history for a portal.
   */
  async getVersionHistory(portalId: string) {
    return this.prisma.projectVersion.findMany({
      where: { portalId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private formatPortal(portal: any, display: any) {
    return {
      id: portal.id,
      projectDisplayId: portal.projectDisplayId,
      repoName: display.repoName,
      repoUrl: display.repoUrl,
      description: display.description,
      techStack: portal.techStack,
      livePreviewUrl: portal.livePreviewUrl,
      demoUrl: portal.demoUrl,
      architectureNotes: portal.architectureNotes,
      readme: portal.readme,
      stars: portal.stars,
      forks: portal.forks,
      versions: portal.versions ?? [],
      lastSynced: portal.lastSynced,
    };
  }
}
