// ── KL DevVerse — Friends Controller ─────────────────────────────────

import {
  Controller, Get, Post, Delete, Param, Body,
  UseGuards, Req,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

interface AuthenticatedUser {
  readonly id: string;
  readonly username: string;
}

@Controller('friends')
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  /** GET /friends — list all friends */
  @Get()
  async getFriends(@Req() req: Request) {
    return this.friendsService.getFriends((req.user as AuthenticatedUser).id);
  }

  /** GET /friends/requests — list pending requests */
  @Get('requests')
  async getPendingRequests(@Req() req: Request) {
    return this.friendsService.getPendingRequests((req.user as AuthenticatedUser).id);
  }

  /** POST /friends/request — send friend request */
  @Post('request')
  async sendRequest(
    @Req() req: Request,
    @Body('targetUserId') targetUserId: string,
  ) {
    return this.friendsService.sendRequest(
      (req.user as AuthenticatedUser).id,
      targetUserId,
    );
  }

  /** POST /friends/accept/:requestId — accept request */
  @Post('accept/:requestId')
  async acceptRequest(
    @Req() req: Request,
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.acceptRequest(
      requestId,
      (req.user as AuthenticatedUser).id,
    );
  }

  /** POST /friends/reject/:requestId — reject request */
  @Post('reject/:requestId')
  async rejectRequest(
    @Req() req: Request,
    @Param('requestId') requestId: string,
  ) {
    return this.friendsService.rejectRequest(
      requestId,
      (req.user as AuthenticatedUser).id,
    );
  }

  /** DELETE /friends/:userId — remove friend */
  @Delete(':userId')
  async removeFriend(
    @Req() req: Request,
    @Param('userId') friendUserId: string,
  ) {
    return this.friendsService.removeFriend(
      (req.user as AuthenticatedUser).id,
      friendUserId,
    );
  }
}
