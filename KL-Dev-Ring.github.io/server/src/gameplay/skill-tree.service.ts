// ── KL DevVerse — Skill Tree Service ─────────────────────────────────
// Manages the 10-branch skill tree system.
// Each branch has 5 tiers (Novice → Apprentice → Adept → Expert → Master).
// Players spend Skill Points earned from leveling up.

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { SkillBranch } from '@prisma/client';

// ── Skill Tree Catalog ───────────────────────────────────────────────

interface SkillNodeDef {
  skillId: string;
  branch: SkillBranch;
  tier: number;       // 1-5
  name: string;
  description: string;
  cost: number;        // skill points
  prerequisite?: string; // skillId of prerequisite node
  reward?: { type: 'title' | 'cosmetic' | 'xp_bonus'; value: string };
}

const SKILL_CATALOG: SkillNodeDef[] = [
  // ── AI Branch ────────────────────────────────────────────────
  { skillId: 'ai_1', branch: 'AI', tier: 1, name: 'AI Novice', description: 'Understand the basics of AI/ML', cost: 1 },
  { skillId: 'ai_2', branch: 'AI', tier: 2, name: 'AI Apprentice', description: 'Build your first model', cost: 2, prerequisite: 'ai_1' },
  { skillId: 'ai_3', branch: 'AI', tier: 3, name: 'AI Adept', description: 'Deploy models to production', cost: 3, prerequisite: 'ai_2' },
  { skillId: 'ai_4', branch: 'AI', tier: 4, name: 'AI Expert', description: 'Fine-tune and optimize models', cost: 5, prerequisite: 'ai_3', reward: { type: 'title', value: 'AI Engineer' } },
  { skillId: 'ai_5', branch: 'AI', tier: 5, name: 'AI Master', description: 'Contribute to AI research', cost: 8, prerequisite: 'ai_4', reward: { type: 'title', value: 'AI Architect' } },

  // ── Fullstack Branch ─────────────────────────────────────────
  { skillId: 'fs_1', branch: 'FULLSTACK', tier: 1, name: 'Web Novice', description: 'HTML, CSS, JS fundamentals', cost: 1 },
  { skillId: 'fs_2', branch: 'FULLSTACK', tier: 2, name: 'Frontend Dev', description: 'React/Vue/Angular proficiency', cost: 2, prerequisite: 'fs_1' },
  { skillId: 'fs_3', branch: 'FULLSTACK', tier: 3, name: 'Backend Dev', description: 'APIs, databases, auth', cost: 3, prerequisite: 'fs_2' },
  { skillId: 'fs_4', branch: 'FULLSTACK', tier: 4, name: 'Fullstack Expert', description: 'End-to-end app development', cost: 5, prerequisite: 'fs_3', reward: { type: 'title', value: 'Fullstack Engineer' } },
  { skillId: 'fs_5', branch: 'FULLSTACK', tier: 5, name: 'Fullstack Master', description: 'System design at scale', cost: 8, prerequisite: 'fs_4', reward: { type: 'title', value: 'Solutions Architect' } },

  // ── Cloud Branch ─────────────────────────────────────────────
  { skillId: 'cl_1', branch: 'CLOUD', tier: 1, name: 'Cloud Novice', description: 'Cloud computing basics', cost: 1 },
  { skillId: 'cl_2', branch: 'CLOUD', tier: 2, name: 'Cloud Apprentice', description: 'Deploy to cloud platforms', cost: 2, prerequisite: 'cl_1' },
  { skillId: 'cl_3', branch: 'CLOUD', tier: 3, name: 'Cloud Adept', description: 'Infrastructure as Code', cost: 3, prerequisite: 'cl_2' },
  { skillId: 'cl_4', branch: 'CLOUD', tier: 4, name: 'Cloud Expert', description: 'Multi-cloud orchestration', cost: 5, prerequisite: 'cl_3', reward: { type: 'title', value: 'Cloud Engineer' } },
  { skillId: 'cl_5', branch: 'CLOUD', tier: 5, name: 'Cloud Master', description: 'Design planetary-scale systems', cost: 8, prerequisite: 'cl_4', reward: { type: 'title', value: 'Cloud Architect' } },

  // ── Cybersecurity Branch ──────────────────────────────────────
  { skillId: 'cs_1', branch: 'CYBERSECURITY', tier: 1, name: 'Security Novice', description: 'Security fundamentals', cost: 1 },
  { skillId: 'cs_2', branch: 'CYBERSECURITY', tier: 2, name: 'Security Apprentice', description: 'Vulnerability assessment', cost: 2, prerequisite: 'cs_1' },
  { skillId: 'cs_3', branch: 'CYBERSECURITY', tier: 3, name: 'Penetration Tester', description: 'Ethical hacking skills', cost: 3, prerequisite: 'cs_2' },
  { skillId: 'cs_4', branch: 'CYBERSECURITY', tier: 4, name: 'Security Expert', description: 'Security architecture design', cost: 5, prerequisite: 'cs_3', reward: { type: 'title', value: 'Security Engineer' } },
  { skillId: 'cs_5', branch: 'CYBERSECURITY', tier: 5, name: 'Security Master', description: 'Zero-trust systems design', cost: 8, prerequisite: 'cs_4', reward: { type: 'title', value: 'Security Architect' } },

  // ── Game Dev Branch ──────────────────────────────────────────
  { skillId: 'gd_1', branch: 'GAMEDEV', tier: 1, name: 'Game Dev Novice', description: 'Game development basics', cost: 1 },
  { skillId: 'gd_2', branch: 'GAMEDEV', tier: 2, name: 'Game Apprentice', description: '2D game development', cost: 2, prerequisite: 'gd_1' },
  { skillId: 'gd_3', branch: 'GAMEDEV', tier: 3, name: 'Game Adept', description: '3D and physics engines', cost: 3, prerequisite: 'gd_2' },
  { skillId: 'gd_4', branch: 'GAMEDEV', tier: 4, name: 'Game Expert', description: 'Multiplayer game systems', cost: 5, prerequisite: 'gd_3', reward: { type: 'title', value: 'Game Engineer' } },
  { skillId: 'gd_5', branch: 'GAMEDEV', tier: 5, name: 'Game Master', description: 'Ship a published game', cost: 8, prerequisite: 'gd_4', reward: { type: 'title', value: 'Game Director' } },

  // ── Open Source Branch ───────────────────────────────────────
  { skillId: 'os_1', branch: 'OPENSOURCE', tier: 1, name: 'Contributor', description: 'First open source contribution', cost: 1 },
  { skillId: 'os_2', branch: 'OPENSOURCE', tier: 2, name: 'Regular Contributor', description: 'Multiple merged PRs', cost: 2, prerequisite: 'os_1' },
  { skillId: 'os_3', branch: 'OPENSOURCE', tier: 3, name: 'Maintainer', description: 'Maintain an open source project', cost: 3, prerequisite: 'os_2' },
  { skillId: 'os_4', branch: 'OPENSOURCE', tier: 4, name: 'Core Maintainer', description: 'Lead a community project', cost: 5, prerequisite: 'os_3', reward: { type: 'title', value: 'Open Source Lead' } },
  { skillId: 'os_5', branch: 'OPENSOURCE', tier: 5, name: 'OS Legend', description: 'Build a widely-used project', cost: 8, prerequisite: 'os_4', reward: { type: 'title', value: 'Open Source Champion' } },

  // ── UI/UX Branch ─────────────────────────────────────────────
  { skillId: 'ux_1', branch: 'UIUX', tier: 1, name: 'Design Novice', description: 'UI/UX fundamentals', cost: 1 },
  { skillId: 'ux_2', branch: 'UIUX', tier: 2, name: 'Design Apprentice', description: 'Wireframing and prototyping', cost: 2, prerequisite: 'ux_1' },
  { skillId: 'ux_3', branch: 'UIUX', tier: 3, name: 'Design Adept', description: 'Design systems creation', cost: 3, prerequisite: 'ux_2' },
  { skillId: 'ux_4', branch: 'UIUX', tier: 4, name: 'Design Expert', description: 'User research and A/B testing', cost: 5, prerequisite: 'ux_3', reward: { type: 'title', value: 'UX Engineer' } },
  { skillId: 'ux_5', branch: 'UIUX', tier: 5, name: 'Design Master', description: 'Design leadership', cost: 8, prerequisite: 'ux_4', reward: { type: 'title', value: 'Design Lead' } },

  // ── Data Science Branch ──────────────────────────────────────
  { skillId: 'ds_1', branch: 'DATASCIENCE', tier: 1, name: 'Data Novice', description: 'Data analysis basics', cost: 1 },
  { skillId: 'ds_2', branch: 'DATASCIENCE', tier: 2, name: 'Data Apprentice', description: 'Statistical analysis', cost: 2, prerequisite: 'ds_1' },
  { skillId: 'ds_3', branch: 'DATASCIENCE', tier: 3, name: 'Data Adept', description: 'Data pipelines and ETL', cost: 3, prerequisite: 'ds_2' },
  { skillId: 'ds_4', branch: 'DATASCIENCE', tier: 4, name: 'Data Expert', description: 'Advanced analytics at scale', cost: 5, prerequisite: 'ds_3', reward: { type: 'title', value: 'Data Engineer' } },
  { skillId: 'ds_5', branch: 'DATASCIENCE', tier: 5, name: 'Data Master', description: 'Data strategy and governance', cost: 8, prerequisite: 'ds_4', reward: { type: 'title', value: 'Data Architect' } },

  // ── ML Branch ────────────────────────────────────────────────
  { skillId: 'ml_1', branch: 'ML', tier: 1, name: 'ML Novice', description: 'Machine learning fundamentals', cost: 1 },
  { skillId: 'ml_2', branch: 'ML', tier: 2, name: 'ML Apprentice', description: 'Supervised/unsupervised learning', cost: 2, prerequisite: 'ml_1' },
  { skillId: 'ml_3', branch: 'ML', tier: 3, name: 'ML Adept', description: 'Deep learning and neural networks', cost: 3, prerequisite: 'ml_2' },
  { skillId: 'ml_4', branch: 'ML', tier: 4, name: 'ML Expert', description: 'MLOps and model serving', cost: 5, prerequisite: 'ml_3', reward: { type: 'title', value: 'ML Engineer' } },
  { skillId: 'ml_5', branch: 'ML', tier: 5, name: 'ML Master', description: 'Novel architectures and research', cost: 8, prerequisite: 'ml_4', reward: { type: 'title', value: 'ML Architect' } },

  // ── Robotics Branch ──────────────────────────────────────────
  { skillId: 'rb_1', branch: 'ROBOTICS', tier: 1, name: 'Robotics Novice', description: 'Embedded systems basics', cost: 1 },
  { skillId: 'rb_2', branch: 'ROBOTICS', tier: 2, name: 'Robotics Apprentice', description: 'Sensor integration', cost: 2, prerequisite: 'rb_1' },
  { skillId: 'rb_3', branch: 'ROBOTICS', tier: 3, name: 'Robotics Adept', description: 'Control systems and SLAM', cost: 3, prerequisite: 'rb_2' },
  { skillId: 'rb_4', branch: 'ROBOTICS', tier: 4, name: 'Robotics Expert', description: 'Autonomous systems', cost: 5, prerequisite: 'rb_3', reward: { type: 'title', value: 'Robotics Engineer' } },
  { skillId: 'rb_5', branch: 'ROBOTICS', tier: 5, name: 'Robotics Master', description: 'Full robotic system design', cost: 8, prerequisite: 'rb_4', reward: { type: 'title', value: 'Robotics Architect' } },
];

@Injectable()
export class SkillTreeService {
  private readonly logger = new Logger(SkillTreeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Get the full catalog — static, no DB read needed */
  getCatalog() {
    return SKILL_CATALOG;
  }

  /**
   * Get skill tree state for a user — catalog merged with unlock state.
   */
  async getSkillTree(userId: string) {
    const unlockedNodes = await this.prisma.skillNode.findMany({
      where: { userId },
    });

    const unlockedMap = new Map(unlockedNodes.map(n => [n.skillId, n]));

    const progress = await this.prisma.builderProgress.findUnique({
      where: { userId },
      select: { skillPoints: true },
    });

    const tree = SKILL_CATALOG.map(node => {
      const unlocked = unlockedMap.get(node.skillId);
      const prerequisiteMet = !node.prerequisite || unlockedMap.has(node.prerequisite);

      return {
        ...node,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt ?? null,
        available: prerequisiteMet && !unlocked,
      };
    });

    return {
      nodes: tree,
      availablePoints: progress?.skillPoints ?? 0,
      totalUnlocked: unlockedNodes.length,
      totalNodes: SKILL_CATALOG.length,
    };
  }

  /**
   * Invest a skill point to unlock a node.
   */
  async investSkillPoint(userId: string, skillId: string) {
    const nodeDef = SKILL_CATALOG.find(n => n.skillId === skillId);
    if (!nodeDef) throw new NotFoundException('Skill node not found');

    // Check not already unlocked
    const existing = await this.prisma.skillNode.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (existing) throw new BadRequestException('Skill already unlocked');

    // Check prerequisite
    if (nodeDef.prerequisite) {
      const prereq = await this.prisma.skillNode.findUnique({
        where: { userId_skillId: { userId, skillId: nodeDef.prerequisite } },
      });
      if (!prereq) throw new BadRequestException(`Prerequisite "${nodeDef.prerequisite}" not unlocked`);
    }

    // Check skill points
    const progress = await this.prisma.builderProgress.findUnique({
      where: { userId },
      select: { skillPoints: true },
    });
    if (!progress || progress.skillPoints < nodeDef.cost) {
      throw new BadRequestException(`Need ${nodeDef.cost} skill points, have ${progress?.skillPoints ?? 0}`);
    }

    // Transaction: create node + deduct points
    const [node] = await this.prisma.$transaction([
      this.prisma.skillNode.create({
        data: {
          userId,
          skillId: nodeDef.skillId,
          branch: nodeDef.branch,
          level: nodeDef.tier,
          xpInvested: nodeDef.cost,
        },
      }),
      this.prisma.builderProgress.update({
        where: { userId },
        data: { skillPoints: { decrement: nodeDef.cost } },
      }),
    ]);

    // Timeline entry for significant unlocks (tier 4+)
    if (nodeDef.tier >= 4) {
      await this.prisma.timelineEntry.create({
        data: {
          userId,
          entryType: 'SKILL_UNLOCKED',
          title: `Unlocked ${nodeDef.name}`,
          description: nodeDef.description,
          metadata: JSON.stringify({ skillId, branch: nodeDef.branch, tier: nodeDef.tier }),
        },
      });
    }

    this.logger.log(`User ${userId} unlocked skill: ${nodeDef.name} (${nodeDef.branch} tier ${nodeDef.tier})`);

    return {
      success: true,
      node,
      reward: nodeDef.reward ?? null,
      pointsRemaining: progress.skillPoints - nodeDef.cost,
    };
  }
}
