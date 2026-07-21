// ── KL DevVerse — Builder Module ─────────────────────────────────────
import { Module } from '@nestjs/common';
import { BuilderService } from './builder.service';
import { BuilderController } from './builder.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BuilderController],
  providers: [BuilderService],
  exports: [BuilderService],
})
export class BuilderModule {}
