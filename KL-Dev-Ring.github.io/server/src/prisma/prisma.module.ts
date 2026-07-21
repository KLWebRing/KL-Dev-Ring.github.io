// ── KL DevVerse — Prisma Module ──────────────────────────────────────
// Global module so PrismaService is available everywhere without re-importing.

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
