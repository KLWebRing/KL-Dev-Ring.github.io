// ── KL DevVerse — Builder Studio Module ──────────────────────────────
import { Module } from '@nestjs/common';
import { StudioService } from './studio.service';
import { StudioController } from './studio.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StudioController],
  providers: [StudioService],
  exports: [StudioService],
})
export class StudioModule {}
