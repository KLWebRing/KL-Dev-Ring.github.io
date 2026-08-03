// ── KL DevVerse — Builder DNA Service ────────────────────────────────
// Computes a builder's DNA type from their skill tree, career, and projects.
// DNA determines the studio's visual identity (colors, equipment, ambience).

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DNAType } from '@prisma/client';

// ── DNA Profile Definitions ─────────────────────────────────────────

interface DNAProfile {
  type: DNAType;
  label: string;
  description: string;
  colorPalette: { primary: string; secondary: string; accent: string; glow: string };
  equipment: string[];    // Auto-placed DNA-specific items
  ambientPreset: string;  // Lighting/sound preset
  triggerBranches: string[]; // SkillBranch values that contribute
}

const DNA_PROFILES: DNAProfile[] = [
  {
    type: 'AI_ENGINEER',
    label: 'AI Engineer',
    description: 'Blue holograms, neural graphics, robots, research equipment.',
    colorPalette: { primary: '#818cf8', secondary: '#312e81', accent: '#c4b5fd', glow: '#6366f1' },
    equipment: ['neural_network_display', 'holographic_brain', 'robot_companion', 'research_terminal', 'data_stream_wall'],
    ambientPreset: 'ai_ambient',
    triggerBranches: ['AI'],
  },
  {
    type: 'ML_ENGINEER',
    label: 'ML Engineer',
    description: 'Tensor visualizations, model training rigs, GPU clusters.',
    colorPalette: { primary: '#c084fc', secondary: '#4c1d95', accent: '#e9d5ff', glow: '#a855f7' },
    equipment: ['gpu_cluster', 'tensor_display', 'training_dashboard', 'model_shelf', 'jupyter_terminal'],
    ambientPreset: 'ml_ambient',
    triggerBranches: ['ML'],
  },
  {
    type: 'GAME_DEV',
    label: 'Game Developer',
    description: 'Arcades, pixel displays, controllers, level editors.',
    colorPalette: { primary: '#fb923c', secondary: '#7c2d12', accent: '#fed7aa', glow: '#f97316' },
    equipment: ['arcade_cabinet', 'pixel_display', 'controller_wall', 'level_editor_desk', 'trophy_shelf_games'],
    ambientPreset: 'gamedev_ambient',
    triggerBranches: ['GAMEDEV'],
  },
  {
    type: 'CLOUD_ENGINEER',
    label: 'Cloud Engineer',
    description: 'Server racks, cloud displays, networking infrastructure.',
    colorPalette: { primary: '#38bdf8', secondary: '#0c4a6e', accent: '#bae6fd', glow: '#0ea5e9' },
    equipment: ['server_rack_array', 'cloud_monitor', 'network_rack', 'container_display', 'uptime_dashboard'],
    ambientPreset: 'cloud_ambient',
    triggerBranches: ['CLOUD'],
  },
  {
    type: 'ROBOTICS',
    label: 'Robotics Engineer',
    description: 'Mechanical arms, drone station, embedded devices.',
    colorPalette: { primary: '#a3e635', secondary: '#365314', accent: '#d9f99d', glow: '#84cc16' },
    equipment: ['robotic_arm', 'drone_station', 'circuit_board_wall', 'oscilloscope', 'prototype_bench'],
    ambientPreset: 'robotics_ambient',
    triggerBranches: ['ROBOTICS'],
  },
  {
    type: 'CYBERSECURITY',
    label: 'Security Architect',
    description: 'SOC room, security monitors, command center.',
    colorPalette: { primary: '#f87171', secondary: '#7f1d1d', accent: '#fecaca', glow: '#ef4444' },
    equipment: ['soc_monitors', 'firewall_display', 'command_center_desk', 'threat_map', 'encryption_terminal'],
    ambientPreset: 'cybersec_ambient',
    triggerBranches: ['CYBERSECURITY'],
  },
  {
    type: 'FULLSTACK',
    label: 'Fullstack Developer',
    description: 'Multi-monitor setup, API diagrams, deployment pipeline.',
    colorPalette: { primary: '#60a5fa', secondary: '#1e3a5f', accent: '#bfdbfe', glow: '#3b82f6' },
    equipment: ['multi_monitor', 'api_diagram_board', 'deployment_pipeline', 'code_review_screen', 'tech_stack_shelf'],
    ambientPreset: 'fullstack_ambient',
    triggerBranches: ['FULLSTACK'],
  },
  {
    type: 'DATASCIENCE',
    label: 'Data Scientist',
    description: 'Data visualizations, statistical dashboards, pipeline monitors.',
    colorPalette: { primary: '#fbbf24', secondary: '#78350f', accent: '#fef3c7', glow: '#f59e0b' },
    equipment: ['data_viz_screen', 'statistics_dashboard', 'pipeline_monitor', 'chart_wall', 'analysis_desk'],
    ambientPreset: 'datascience_ambient',
    triggerBranches: ['DATASCIENCE'],
  },
  {
    type: 'DESIGNER',
    label: 'UI/UX Designer',
    description: 'Design workspace with color palettes, prototyping tools.',
    colorPalette: { primary: '#f472b6', secondary: '#831843', accent: '#fbcfe8', glow: '#ec4899' },
    equipment: ['design_tablet', 'color_palette_wall', 'prototype_screen', 'typography_shelf', 'mood_board'],
    ambientPreset: 'design_ambient',
    triggerBranches: ['UIUX'],
  },
  {
    type: 'OPENSOURCE',
    label: 'Open Source Champion',
    description: 'Community boards, contributor maps, PR dashboards.',
    colorPalette: { primary: '#34d399', secondary: '#064e3b', accent: '#a7f3d0', glow: '#10b981' },
    equipment: ['contributor_map', 'pr_dashboard', 'community_board', 'open_source_trophy', 'star_counter'],
    ambientPreset: 'opensource_ambient',
    triggerBranches: ['OPENSOURCE'],
  },
];

@Injectable()
export class BuilderDNAService {
  private readonly logger = new Logger(BuilderDNAService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute DNA type from skill tree data.
   * Highest skill investment determines primary type.
   */
  async computeDNA(userId: string) {
    // Get all unlocked skill nodes with XP invested
    const nodes = await this.prisma.skillNode.findMany({
      where: { userId },
      select: { branch: true, xpInvested: true },
    });

    // Tally XP per branch
    const branchScores = new Map<string, number>();
    for (const node of nodes) {
      branchScores.set(node.branch, (branchScores.get(node.branch) ?? 0) + node.xpInvested);
    }

    // Sort by score descending
    const sorted = [...branchScores.entries()].sort((a, b) => b[1] - a[1]);

    // Match to DNA profile
    let primaryType: DNAType = 'FULLSTACK'; // default
    let secondaryType: DNAType | null = null;

    if (sorted.length > 0) {
      const topBranch = sorted[0]![0];
      const profile = DNA_PROFILES.find(p => p.triggerBranches.includes(topBranch));
      if (profile) primaryType = profile.type;
    }

    if (sorted.length > 1) {
      const secondBranch = sorted[1]![0];
      const profile = DNA_PROFILES.find(p => p.triggerBranches.includes(secondBranch));
      if (profile) secondaryType = profile.type;
    }

    const primaryProfile = DNA_PROFILES.find(p => p.type === primaryType) ?? DNA_PROFILES[6]!; // FULLSTACK fallback

    // Upsert DNA record
    const dna = await this.prisma.builderDNA.upsert({
      where: { userId },
      create: {
        userId,
        primaryType,
        secondaryType,
        colorPalette: JSON.stringify(primaryProfile.colorPalette),
        equipment: JSON.stringify(primaryProfile.equipment),
        ambientPreset: primaryProfile.ambientPreset,
      },
      update: {
        primaryType,
        secondaryType,
        colorPalette: JSON.stringify(primaryProfile.colorPalette),
        equipment: JSON.stringify(primaryProfile.equipment),
        ambientPreset: primaryProfile.ambientPreset,
      },
    });

    this.logger.log(`🧬 DNA computed for ${userId}: ${primaryType}${secondaryType ? ` + ${secondaryType}` : ''}`);
    return dna;
  }

  /**
   * Get current DNA state with profile metadata.
   */
  async getDNA(userId: string) {
    let dna = await this.prisma.builderDNA.findUnique({ where: { userId } });

    if (!dna) {
      dna = await this.computeDNA(userId);
    }

    const primaryProfile = DNA_PROFILES.find(p => p.type === dna!.primaryType) ?? DNA_PROFILES[6]!;
    const secondaryProfile = dna.secondaryType
      ? DNA_PROFILES.find(p => p.type === dna!.secondaryType) ?? null
      : null;

    let palette = {};
    let equipment: string[] = [];
    try { palette = JSON.parse(dna.colorPalette); } catch { /* empty */ }
    try { equipment = JSON.parse(dna.equipment); } catch { /* empty */ }

    return {
      primaryType: dna.primaryType,
      primaryLabel: primaryProfile.label,
      primaryDescription: primaryProfile.description,
      secondaryType: dna.secondaryType,
      secondaryLabel: secondaryProfile?.label ?? null,
      colorPalette: palette,
      equipment,
      ambientPreset: dna.ambientPreset,
      allProfiles: DNA_PROFILES.map(p => ({
        type: p.type,
        label: p.label,
        description: p.description,
        colorPalette: p.colorPalette,
      })),
    };
  }
}
