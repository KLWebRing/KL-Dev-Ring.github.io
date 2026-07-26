// ── KL DevVerse — Auth Service ───────────────────────────────────────
// Handles GitHub OAuth callback, JWT token creation, and session management.

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService, CreateUserInput } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { StudioService } from '../studio/studio.service';
import * as crypto from 'crypto';

interface GitHubProfile {
  readonly id: number;
  readonly login: string;
  readonly name: string | null;
  readonly avatar_url: string;
  readonly html_url: string;
  readonly email: string | null;
  readonly bio: string | null;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly studioService: StudioService,
  ) {}

  /**
   * Process GitHub OAuth callback.
   * Creates or updates the user, generates JWT tokens, creates a session.
   */
  async handleGitHubLogin(profile: GitHubProfile) {
    const input: CreateUserInput = {
      githubId: profile.id,
      username: profile.login,
      displayName: profile.name ?? profile.login,
      avatarUrl: profile.avatar_url,
      profileUrl: profile.html_url,
      email: profile.email,
      bio: profile.bio,
    };

    const user = await this.usersService.findOrCreateFromGitHub(input);

    // Generate tokens
    const accessToken = this.createAccessToken(user.id, user.username);
    const refreshToken = this.createRefreshToken();

    // Store session in DB
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
      },
    });

    // Cache user in Redis for fast lookups
    await this.redis.set(
      `user:${user.id}`,
      JSON.stringify({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      }),
      3600, // 1 hour TTL
    );

    this.logger.log(`User logged in: @${user.username}`);

    // ── Auto-Provision Builder Studio on first login ─────────────
    // This is idempotent — getOrCreateStudio only creates if missing.
    try {
      await this.studioService.getOrCreateStudio(user.id);
    } catch (err) {
      this.logger.warn(`Failed to auto-provision studio for ${user.id}: ${err}`);
      // Non-critical — login still succeeds
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        profileUrl: user.profileUrl,
        email: user.email,
      },
    };
  }

  /**
   * Refresh an expired access token using a valid refresh token.
   */
  async refreshAccessToken(refreshToken: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = session.user;
    const newAccessToken = this.createAccessToken(user.id, user.username);

    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        profileUrl: user.profileUrl,
        email: user.email,
      },
    };
  }

  /**
   * Logout — invalidate the session.
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.session.deleteMany({
        where: { userId, refreshToken },
      });
    } else {
      // Nuke all sessions for this user
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }

    await this.redis.del(`user:${userId}`);
    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Validate a JWT payload — called by JwtStrategy.
   */
  async validateJwtPayload(payload: { sub: string; username: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  // ── Private helpers ────────────────────────────────────────────────

  private createAccessToken(userId: string, username: string): string {
    return this.jwtService.sign(
      { sub: userId, username },
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  private createRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }
}
