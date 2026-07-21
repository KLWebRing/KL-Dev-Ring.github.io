// ── KL DevVerse — Game Module ────────────────────────────────────────
// Registers Colyseus rooms within the NestJS lifecycle.

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { TownRoom } from './rooms/TownRoom';
import { createServer } from 'http';

@Module({})
export class GameModule implements OnModuleInit {
  private readonly logger = new Logger(GameModule.name);
  private gameServer: Server | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const port = this.config.get<number>('COLYSEUS_PORT', 2567);

    const httpServer = createServer();
    const transport = new WebSocketTransport({ server: httpServer });

    this.gameServer = new Server({ transport });
    this.gameServer.define('town', TownRoom);

    httpServer.listen(port, () => {
      this.logger.log(`Colyseus game server listening on ws://localhost:${port}`);
    });
  }
}
