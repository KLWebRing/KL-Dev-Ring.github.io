// ── KL DevVerse — GitHub OAuth Strategy ──────────────────────────────
// Passport strategy for GitHub OAuth2.

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

interface GitHubOAuthProfile {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly photos: ReadonlyArray<{ value: string }>;
  readonly profileUrl: string;
  readonly emails?: ReadonlyArray<{ value: string }>;
  readonly _json: {
    readonly bio: string | null;
  };
}

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: config.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GitHubOAuthProfile,
  ) {
    // Return a normalized profile object for the auth callback
    return {
      id: parseInt(profile.id, 10),
      login: profile.username,
      name: profile.displayName || null,
      avatar_url: profile.photos?.[0]?.value ?? '',
      html_url: profile.profileUrl,
      email: profile.emails?.[0]?.value ?? null,
      bio: profile._json?.bio ?? null,
    };
  }
}
