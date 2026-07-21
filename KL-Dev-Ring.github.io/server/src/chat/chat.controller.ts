// ── KL DevVerse — Chat Controller ────────────────────────────────────

import {
  Controller, Get, Query, Param, UseGuards, Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** GET /chat/messages?channel=global&limit=50 */
  @Get('messages')
  async getMessages(
    @Query('channel') channel: string = 'global',
    @Query('limit') limit: string = '50',
  ) {
    const validChannels = ['global', 'nearby', 'district', 'system'] as const;
    const ch = validChannels.includes(channel as typeof validChannels[number])
      ? (channel as typeof validChannels[number])
      : 'global';
    return this.chatService.getRecentMessages(ch, Math.min(parseInt(limit, 10) || 50, 200));
  }

  /** GET /chat/private/:userId */
  @Get('private/:userId')
  async getPrivateMessages(
    @Req() req: Request,
    @Param('userId') otherUserId: string,
    @Query('limit') limit: string = '50',
  ) {
    const user = req.user as { id: string };
    return this.chatService.getPrivateMessages(
      user.id,
      otherUserId,
      Math.min(parseInt(limit, 10) || 50, 200),
    );
  }
}
