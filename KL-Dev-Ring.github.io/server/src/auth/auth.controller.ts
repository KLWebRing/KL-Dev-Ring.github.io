// ── KL DevVerse — Auth Controller ────────────────────────────────────
// Handles GitHub OAuth redirect flow, token refresh, and logout.

import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  /**
   * GET /auth/github
   * Redirects the user to GitHub's OAuth consent screen.
   */
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin() {
    // Passport handles the redirect
  }

  /**
   * GET /auth/github/callback
   * GitHub redirects here after user authorizes.
   * Processes the OAuth data, sets refresh token cookie, redirects to client.
   */
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.handleGitHubLogin(req.user as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string;
      html_url: string;
      email: string | null;
      bio: string | null;
    });

    // Set refresh token as httpOnly cookie
    res.cookie('kl_refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Redirect to client with access token in URL fragment
    const clientUrl = this.config.get<string>('CLIENT_URL', 'http://localhost:5173');
    res.redirect(`${clientUrl}/auth/callback#token=${result.accessToken}`);
  }

  /**
   * POST /auth/refresh
   * Uses the refresh token cookie to issue a new access token.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request) {
    const refreshToken = req.cookies?.['kl_refresh_token'] as string | undefined;
    if (!refreshToken) {
      return { error: 'No refresh token' };
    }

    return this.authService.refreshAccessToken(refreshToken);
  }

  /**
   * POST /auth/logout
   * Invalidates the session.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { id: string };
    const refreshToken = req.cookies?.['kl_refresh_token'] as string | undefined;

    await this.authService.logout(user.id, refreshToken);

    res.clearCookie('kl_refresh_token', { path: '/' });
    res.json({ success: true });
  }

  /**
   * GET /auth/me
   * Returns the currently authenticated user's profile.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const user = req.user as {
      id: string;
      githubId: number;
      username: string;
      displayName: string;
      avatarUrl: string;
      profileUrl: string;
      email: string | null;
    };

    return {
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      profileUrl: user.profileUrl,
      email: user.email,
    };
  }
}
