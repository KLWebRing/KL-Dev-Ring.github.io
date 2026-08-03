// ── KL DevVerse — Evolution Service ──────────────────────────────────
// Computes and persists studio evolution based on builder stats.
// Studios evolve AUTOMATICALLY — no manual upgrades needed.
// Reads from: BuilderProgress, BuilderCareer, SkillNode, ProjectDisplay, Achievement.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { EvolutionStage } from '@prisma/client';

// ── Evolution Stage Definitions ─────────────────────────────────────

interface EvolutionDef {
  stage: EvolutionStage;
  label: string;
  description: string;
  autoFurniture: string[];   // Items that appear when stage is reached
  trigger: {
    minProjects?: number;
    minLevel?: number;
    minReputation?: number;
    minSkillNodes?: number;
    minAchievements?: number;
    minCareerRank?: number;
    minInnovationScore?: number;
  };
}

const EVOLUTION_STAGES: EvolutionDef[] = [
  {
    stage: 'DESK',
    label: 'Laptop Desk',
    description: 'A single laptop on a small desk. The humble beginning.',
    autoFurniture: ['laptop', 'small_desk', 'desk_lamp'],
    trigger: { minProjects: 1 },
  },
  {
    stage: 'WORKSPACE',
    label: 'Dual Monitor Workspace',
    description: 'A proper workspace with dual monitors, keyboard, and reference books.',
    autoFurniture: ['dual_monitors', 'ergonomic_desk', 'bookshelf', 'keyboard', 'code_poster'],
    trigger: { minProjects: 10, minLevel: 5 },
  },
  {
    stage: 'LAB',
    label: 'Innovation Lab',
    description: 'A lab with community board, whiteboard, and collaboration tools.',
    autoFurniture: ['community_board', 'whiteboard', 'standing_desk', 'triple_monitor', 'coffee_machine', 'plant_wall'],
    trigger: { minProjects: 25, minLevel: 15, minReputation: 100, minSkillNodes: 5 },
  },
  {
    stage: 'WING',
    label: 'Innovation Wing',
    description: 'A spacious wing with holographic displays, a research corner, and trophy shelf.',
    autoFurniture: ['holographic_display', 'research_desk', 'trophy_shelf', 'server_rack', 'ai_assistant_pod', 'lounge_sofa'],
    trigger: { minProjects: 50, minLevel: 30, minReputation: 500, minSkillNodes: 15, minInnovationScore: 200 },
  },
  {
    stage: 'CAMPUS',
    label: 'Tech Campus',
    description: 'A full campus with robotics lab, AI corner, presentation room, and garden.',
    autoFurniture: ['robotics_arm', 'ai_neural_display', 'presentation_screen', 'indoor_garden', 'drone_pad', 'quantum_processor_display'],
    trigger: { minProjects: 75, minLevel: 50, minReputation: 1000, minSkillNodes: 25, minCareerRank: 7 },
  },
  {
    stage: 'HQ',
    label: 'Executive HQ',
    description: 'The pinnacle. A full headquarters with executive office, innovation museum, and legacy hall.',
    autoFurniture: ['executive_desk', 'panoramic_screen', 'innovation_museum', 'legacy_hall', 'founder_trophy', 'golden_keyboard', 'helipad'],
    trigger: { minProjects: 100, minLevel: 75, minReputation: 5000, minSkillNodes: 40, minCareerRank: 9, minInnovationScore: 1000 },
  },
];

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute and persist the current evolution stage for a user.
   * Called after any progression event (level up, project add, etc.)
   */
  async computeEvolution(userId: string) {
    // Gather all relevant stats
    const [progress, career, projectCount, skillCount, achievementCount] = await Promise.all([
      this.prisma.builderProgress.findUnique({
        where: { userId },
        select: { level: true, reputation: true, innovationScore: true },
      }),
      this.prisma.builderCareer.findUnique({
        where: { userId },
        select: { totalProjectsShipped: true },
      }),
      this.prisma.projectDisplay.count({
        where: { studio: { userId } },
      }),
      this.prisma.skillNode.count({ where: { userId } }),
      this.prisma.achievement.count({ where: { userId } }),
    ]);

    const stats = {
      projects: Math.max(projectCount, career?.totalProjectsShipped ?? 0),
      level: progress?.level ?? 1,
      reputation: progress?.reputation ?? 0,
      innovationScore: progress?.innovationScore ?? 0,
      skillNodes: skillCount,
      achievements: achievementCount,
      careerRank: 1, // default
    };

    // Get career rank from BuilderProgress
    const progressFull = await this.prisma.builderProgress.findUnique({
      where: { userId },
      select: { builderRank: true },
    });
    stats.careerRank = progressFull?.builderRank ?? 1;

    // Determine highest qualifying stage
    let newStage: EvolutionStage = 'DESK';
    let newFurniture: string[] = EVOLUTION_STAGES[0]!.autoFurniture;

    for (const def of EVOLUTION_STAGES) {
      const t = def.trigger;
      const meets =
        (t.minProjects === undefined || stats.projects >= t.minProjects) &&
        (t.minLevel === undefined || stats.level >= t.minLevel) &&
        (t.minReputation === undefined || stats.reputation >= t.minReputation) &&
        (t.minSkillNodes === undefined || stats.skillNodes >= t.minSkillNodes) &&
        (t.minAchievements === undefined || stats.achievements >= t.minAchievements) &&
        (t.minCareerRank === undefined || stats.careerRank >= t.minCareerRank) &&
        (t.minInnovationScore === undefined || stats.innovationScore >= t.minInnovationScore);

      if (meets) {
        newStage = def.stage;
        // Accumulate furniture from all unlocked stages
        newFurniture = EVOLUTION_STAGES
          .slice(0, EVOLUTION_STAGES.indexOf(def) + 1)
          .flatMap(s => s.autoFurniture);
      }
    }

    // Upsert evolution state
    const existing = await this.prisma.studioEvolution.findUnique({ where: { userId } });
    const hasEvolved = existing?.evolutionStage !== newStage;

    const evolution = await this.prisma.studioEvolution.upsert({
      where: { userId },
      create: {
        userId,
        evolutionStage: newStage,
        autoFurniture: JSON.stringify(newFurniture),
        totalTriggers: 1,
        computedAt: new Date(),
      },
      update: {
        evolutionStage: newStage,
        autoFurniture: JSON.stringify(newFurniture),
        totalTriggers: { increment: hasEvolved ? 1 : 0 },
        lastEvolved: hasEvolved ? new Date() : undefined,
        computedAt: new Date(),
      },
    });

    // Log timeline entry on evolution
    if (hasEvolved && existing) {
      const stageDef = EVOLUTION_STAGES.find(s => s.stage === newStage);
      await this.prisma.timelineEntry.create({
        data: {
          userId,
          entryType: 'STUDIO_UPGRADE',
          title: `Studio evolved to ${stageDef?.label ?? newStage}`,
          description: stageDef?.description ?? '',
          metadata: JSON.stringify({
            previousStage: existing.evolutionStage,
            newStage,
            furnitureCount: newFurniture.length,
          }),
        },
      });
      this.logger.log(`🏗️ Studio evolved for ${userId}: ${existing.evolutionStage} → ${newStage}`);
    }

    return evolution;
  }

  /**
   * Get current evolution state with stage metadata.
   */
  async getEvolutionState(userId: string) {
    let evolution = await this.prisma.studioEvolution.findUnique({ where: { userId } });

    if (!evolution) {
      evolution = await this.computeEvolution(userId);
    }

    const stageDef = EVOLUTION_STAGES.find(s => s.stage === evolution!.evolutionStage) ?? EVOLUTION_STAGES[0]!;
    const stageIndex = EVOLUTION_STAGES.findIndex(s => s.stage === evolution!.evolutionStage);
    const nextStage = stageIndex < EVOLUTION_STAGES.length - 1 ? EVOLUTION_STAGES[stageIndex + 1] : null;

    let parsedFurniture: string[] = [];
    try { parsedFurniture = JSON.parse(evolution.autoFurniture); } catch { /* empty */ }

    return {
      id: evolution.id,
      stage: evolution.evolutionStage,
      stageIndex,
      label: stageDef.label,
      description: stageDef.description,
      autoFurniture: parsedFurniture,
      totalStages: EVOLUTION_STAGES.length,
      nextStage: nextStage ? {
        stage: nextStage.stage,
        label: nextStage.label,
        requirements: nextStage.trigger,
      } : null,
      lastEvolved: evolution.lastEvolved,
    };
  }

  /** Get the full evolution catalog (for UI progress display). */
  getCatalog() {
    return EVOLUTION_STAGES.map((s, i) => ({
      stage: s.stage,
      index: i,
      label: s.label,
      description: s.description,
      furnitureCount: s.autoFurniture.length,
      requirements: s.trigger,
    }));
  }
}
