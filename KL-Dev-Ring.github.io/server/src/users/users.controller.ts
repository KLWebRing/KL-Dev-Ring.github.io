// ── KL DevVerse — Users Controller ───────────────────────────────────

import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.findWithProfile(id);
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      profileUrl: user.profileUrl,
      bio: user.bio,
      builderLevel: user.profile?.builderLevel ?? 1,
      xp: user.profile?.xp ?? 0,
      tagline: user.profile?.tagline ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  @Get('search')
  async searchUsers(@Query('q') query: string) {
    if (!query || query.length < 2) return [];
    const users = await this.usersService.searchByUsername(query);
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
    }));
  }
}
