// ── KL DevVerse — Users Service ──────────────────────────────────────
// CRUD operations for User records.
// Called by AuthService during login, and by other modules for lookups.

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '@prisma/client';

export interface CreateUserInput {
  readonly githubId: number;
  readonly username: string;
  readonly displayName: string;
  readonly avatarUrl: string;
  readonly profileUrl: string;
  readonly email: string | null;
  readonly bio: string | null;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Find user by internal ID */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /** Find user by GitHub numeric ID */
  async findByGithubId(githubId: number): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { githubId } });
  }

  /** Find user by username */
  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  /**
   * Find or create a user from GitHub OAuth data.
   * Used during the login flow — upserts on githubId.
   */
  async findOrCreateFromGitHub(input: CreateUserInput): Promise<User> {
    const existing = await this.findByGithubId(input.githubId);

    if (existing) {
      // Update profile data from GitHub (avatar, bio, etc. may change)
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          profileUrl: input.profileUrl,
          email: input.email,
          bio: input.bio,
        },
      });
    }

    // Create new user + default profile + default settings
    const user = await this.prisma.user.create({
      data: {
        githubId: input.githubId,
        username: input.username,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        profileUrl: input.profileUrl,
        email: input.email,
        bio: input.bio,
        profile: {
          create: {
            builderLevel: 1,
            xp: 0,
          },
        },
        settings: {
          create: {},
        },
      },
    });

    this.logger.log(`New user created: @${user.username} (${user.id})`);
    return user;
  }

  /** Get user with profile and settings for full passport data */
  async findWithProfile(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        settings: true,
      },
    });
  }

  /** Search users by username prefix (for friend search) */
  async searchByUsername(query: string, limit: number = 20): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        username: {
          startsWith: query,
          mode: 'insensitive',
        },
      },
      take: limit,
      orderBy: { username: 'asc' },
    });
  }
}
