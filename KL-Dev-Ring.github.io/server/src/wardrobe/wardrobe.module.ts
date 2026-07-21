// ── KL DevVerse — Wardrobe Module ────────────────────────────────────
import { Module } from '@nestjs/common';
import { WardrobeService } from './wardrobe.service';
import { WardrobeController } from './wardrobe.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WardrobeController],
  providers: [WardrobeService],
  exports: [WardrobeService],
})
export class WardrobeModule {}
