// ── KL DevVerse — Economy Module ─────────────────────────────────────
// Wires wallet, marketplace, purchase, and studio upgrade services.

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { InventoryModule } from '../inventory/inventory.module';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';

@Module({
  imports: [PrismaModule, RedisModule, InventoryModule],
  controllers: [WalletController, MarketplaceController, PurchaseController],
  providers: [WalletService, MarketplaceService, PurchaseService],
  exports: [WalletService, MarketplaceService, PurchaseService],
})
export class EconomyModule {}
