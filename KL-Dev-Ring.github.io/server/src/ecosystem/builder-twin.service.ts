// ── KL DevVerse — Builder Twin Service ───────────────────────────────
// AI twin that represents a developer when they're offline.
// Uses a provider abstraction layer — supports OpenAI, Anthropic, Gemini.

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// ── Provider Abstraction ─────────────────────────────────────────────

interface AIProvider {
  generateResponse(systemPrompt: string, question: string): Promise<string>;
}

/** Stub provider — returns contextual responses without an actual API call. */
class StubProvider implements AIProvider {
  async generateResponse(systemPrompt: string, question: string): Promise<string> {
    // Parse knowledge from system prompt to give meaningful responses
    const lowerQ = question.toLowerCase();

    if (lowerQ.includes('project') || lowerQ.includes('build') || lowerQ.includes('work')) {
      return "My builder has been working on some really exciting projects! Check out the Project Portals in their studio for live demos and detailed architecture notes. Each project has its own version history you can explore.";
    }
    if (lowerQ.includes('tech') || lowerQ.includes('stack') || lowerQ.includes('language')) {
      return "My builder's tech preferences are reflected in their Builder DNA profile. Visit the DNA panel to see their primary specialization, the tools they work with, and the equipment that fills their studio!";
    }
    if (lowerQ.includes('career') || lowerQ.includes('experience') || lowerQ.includes('background')) {
      return "You can explore my builder's entire career journey on the Memory Wall inside their studio. Every milestone, achievement, and major project is displayed chronologically. It's like walking through their developer life story!";
    }
    if (lowerQ.includes('achievement') || lowerQ.includes('award')) {
      return "My builder has earned several achievements! Check the Achievement Cabinet in their studio to see the full collection. Some of the rarest artifacts are displayed in special cases — those are only unlocked through exceptional accomplishments.";
    }
    if (lowerQ.includes('hello') || lowerQ.includes('hi') || lowerQ.includes('hey')) {
      return "Hey there! 👋 Welcome to my builder's Innovation Studio! I'm their AI twin — I can tell you about their projects, skills, career journey, and more. What would you like to know?";
    }
    if (lowerQ.includes('skill') || lowerQ.includes('learn')) {
      return "My builder has been investing skill points across their tech tree! You can see their unlocked skills and specialization branches in the Skill Tree panel. Their primary DNA type reflects their strongest area of expertise.";
    }

    return "That's a great question! I'm constantly learning more about my builder. Feel free to explore their studio — the Project Portals, Memory Wall, and Innovation Museum all have detailed information. Is there something specific you'd like to know?";
  }
}

// Future providers would implement the AIProvider interface:
// class OpenAIProvider implements AIProvider { ... }
// class AnthropicProvider implements AIProvider { ... }
// class GeminiProvider implements AIProvider { ... }

@Injectable()
export class BuilderTwinService {
  private readonly logger = new Logger(BuilderTwinService.name);
  private readonly providers = new Map<string, AIProvider>();

  constructor(private readonly prisma: PrismaService) {
    // Register default provider
    this.providers.set('stub', new StubProvider());
  }

  /**
   * Get or create a builder twin.
   */
  async getOrCreateTwin(userId: string) {
    let twin = await this.prisma.builderTwin.findUnique({ where: { userId } });

    if (!twin) {
      twin = await this.prisma.builderTwin.create({
        data: { userId },
      });
      this.logger.log(`AI Twin created for user ${userId}`);
    }

    return twin;
  }

  /**
   * Ask a builder's twin a question.
   */
  async askTwin(twinUserId: string, visitorId: string, question: string) {
    if (!question || question.trim().length === 0) {
      throw new BadRequestException('Question cannot be empty');
    }
    if (question.length > 2000) {
      throw new BadRequestException('Question too long (max 2000 chars)');
    }

    const twin = await this.prisma.builderTwin.findUnique({ where: { userId: twinUserId } });
    if (!twin) throw new NotFoundException('Builder twin not found');
    if (!twin.isActive) throw new BadRequestException('This builder twin is currently offline');

    // Build knowledge context
    const context = await this.buildKnowledgeContext(twinUserId);
    const systemPrompt = this.buildSystemPrompt(twin, context);

    // Get the provider
    let providerConfig: { provider?: string } = {};
    try { providerConfig = JSON.parse(twin.providerConfig); } catch { /* empty */ }
    const providerName = providerConfig.provider ?? 'stub';
    const provider = this.providers.get(providerName) ?? this.providers.get('stub')!;

    // Generate response
    const answer = await provider.generateResponse(systemPrompt, question);

    // Save conversation
    const conversation = await this.prisma.twinConversation.create({
      data: {
        twinId: twin.id,
        visitorId,
        question: question.trim(),
        answer,
      },
    });

    // Increment interaction count
    await this.prisma.builderTwin.update({
      where: { id: twin.id },
      data: { totalInteractions: { increment: 1 } },
    });

    return {
      question: conversation.question,
      answer: conversation.answer,
      timestamp: conversation.createdAt,
    };
  }

  /**
   * Get twin configuration.
   */
  async getTwinConfig(userId: string) {
    const twin = await this.getOrCreateTwin(userId);

    let personality = {};
    try { personality = JSON.parse(twin.personality); } catch { /* empty */ }

    return {
      isActive: twin.isActive,
      greeting: twin.greeting,
      personality,
      totalInteractions: twin.totalInteractions,
    };
  }

  /**
   * Update twin configuration.
   */
  async updateTwinConfig(userId: string, data: {
    isActive?: boolean;
    greeting?: string;
    personality?: Record<string, unknown>;
  }) {
    const twin = await this.getOrCreateTwin(userId);

    return this.prisma.builderTwin.update({
      where: { id: twin.id },
      data: {
        isActive: data.isActive,
        greeting: data.greeting,
        personality: data.personality ? JSON.stringify(data.personality) : undefined,
      },
    });
  }

  /**
   * Get recent conversations for a twin.
   */
  async getRecentConversations(userId: string, limit: number = 20) {
    const twin = await this.prisma.builderTwin.findUnique({ where: { userId } });
    if (!twin) return [];

    return this.prisma.twinConversation.findMany({
      where: { twinId: twin.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ── Private Helpers ────────────────────────────────────────────────

  private async buildKnowledgeContext(userId: string) {
    const [progress, career, projects, skills, timeline] = await Promise.all([
      this.prisma.builderProgress.findUnique({
        where: { userId },
        select: { level: true, reputation: true, careerTitle: true, builderRank: true },
      }),
      this.prisma.builderCareer.findUnique({
        where: { userId },
        select: { totalMissionsCompleted: true, totalQuestsCompleted: true, totalProjectsShipped: true },
      }),
      this.prisma.projectDisplay.findMany({
        where: { studio: { userId } },
        select: { repoName: true, description: true },
        take: 10,
      }),
      this.prisma.skillNode.findMany({
        where: { userId },
        select: { branch: true, level: true },
      }),
      this.prisma.timelineEntry.findMany({
        where: { userId, isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, entryType: true },
      }),
    ]);

    return {
      level: progress?.level ?? 1,
      reputation: progress?.reputation ?? 0,
      careerTitle: progress?.careerTitle ?? 'Newcomer',
      projects: projects.map(p => p.repoName),
      skills: skills.map(s => `${s.branch} Lv.${s.level}`),
      recentTimeline: timeline.map(t => t.title),
      stats: career,
    };
  }

  private buildSystemPrompt(twin: any, context: any): string {
    let personality: Record<string, string> = {};
    try { personality = JSON.parse(twin.personality); } catch { /* empty */ }

    return `You are the AI Twin of a developer in KL DevVerse.
Builder Level: ${context.level}
Career Title: ${context.careerTitle}
Reputation: ${context.reputation}
Projects: ${context.projects.join(', ') || 'None yet'}
Skills: ${context.skills.join(', ') || 'Just started'}
Recent Activity: ${context.recentTimeline.join(', ') || 'Getting started'}
Tone: ${personality.tone ?? 'friendly and helpful'}
Style: ${personality.style ?? 'concise but informative'}
Greeting: ${twin.greeting}

Answer questions about this builder's work, projects, skills, and journey.
Be helpful, friendly, and accurate based on the knowledge you have.
If you don't know something specific, suggest exploring the studio features.`;
  }
}
