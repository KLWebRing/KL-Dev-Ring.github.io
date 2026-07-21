// ── KL DevVerse — Root Application Module ────────────────────────────
// Wires together all server modules.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';
import { ChatModule } from './chat/chat.module';
import { PresenceModule } from './presence/presence.module';
import { GameModule } from './game/game.module';

// Phase 3 — Builder Identity
import { HouseModule } from './house/house.module';
import { InventoryModule } from './inventory/inventory.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { BuilderModule } from './builder/builder.module';
import { AchievementModule } from './achievement/achievement.module';

@Module({
  imports: [
    // Configuration (loads .env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,

    // Feature modules
    // Phase 2 feature modules
    AuthModule,
    UsersModule,
    FriendsModule,
    ChatModule,
    PresenceModule,
    GameModule,

    // Phase 3 — Builder Identity
    HouseModule,
    InventoryModule,
    WardrobeModule,
    BuilderModule,
    AchievementModule,
  ],
})
export class AppModule {}
