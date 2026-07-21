// ── KL DevVerse — Prisma Service ─────────────────────────────────────
// Wraps PrismaClient as a NestJS injectable service.
// Handles connection lifecycle (connect on init, disconnect on destroy).

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
