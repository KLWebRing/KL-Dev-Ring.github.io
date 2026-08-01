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
import { StudioModule } from './studio/studio.module';
import { InventoryModule } from './inventory/inventory.module';
import { WardrobeModule } from './wardrobe/wardrobe.module';
import { BuilderModule } from './builder/builder.module';
import { AchievementModule } from './achievement/achievement.module';

// Phase 5 — Builder Economy
import { EconomyModule } from './economy/economy.module';

// Phase 6 — Developer Life Engine
import { GameplayModule } from './gameplay/gameplay.module';

@Module({
  imports: [
    // Configuration — loads .env (cloud-native, no localhost assumptions)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
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
    StudioModule,
    InventoryModule,
    WardrobeModule,
    BuilderModule,
    AchievementModule,

    // Phase 5 — Builder Economy
    EconomyModule,

    // Phase 6 — Developer Life Engine
    GameplayModule,
  ],
})
export class AppModule {}
