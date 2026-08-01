// ── KL DevVerse — Economy Module ─────────────────────────────────────
// Wires wallet, marketplace, purchase, and studio upgrade services.

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class EconomyModule {}
