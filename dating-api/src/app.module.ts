import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { AuthSessionConfigModule } from './config/auth-session-config.module';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContradictionModule } from './contradiction/contradiction.module';
import { EvaluateModule } from './evaluate/evaluate.module';
import { HealthModule } from './health/health.module';
import { SimpleLoggerModule } from './logger/simple-logger.module';
import { StructuredLoggingModule } from './logging/structured-logging.module';
import { LlmModule } from './llm/llm.module';
import { HolyGrailMatchingModule } from './holy-grail-matching/holy-grail-matching.module';
import { LegacyBackendModule } from './legacy/legacy-backend.module';
import { MatchesModule } from './matches/matches.module';
import { MessagingRealtimeModule } from './messaging-realtime/messaging-realtime.module';
import { MeProfileModule } from './me-profile/me-profile.module';
import { MeAccountModule } from './me-account/me-account.module';
import { ReportsModule } from './reports/reports.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PrismaModule } from './prisma/prisma.module';
import { PhotoStorageModule } from './photo-storage/photo-storage.module';
import { SessionModule } from './session/session.module';
import { RedisCacheModule } from './cache/redis-cache.module';
import { WorkerModule } from './workers/worker.module';
import { ContentModerationModule } from './content-moderation/content-moderation.module';

@Module({
  imports: [
    // Resolve `.env` from the dating-api package root (compiled `dist/` or `src/`), not `process.cwd()`,
    // so DATABASE_URL loads when Nest is started from a parent directory or via tooling.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '.env') }),
    AnalyticsModule,
    AuthSessionConfigModule,
    PhotoStorageModule,
    PrismaModule,
    RedisCacheModule,
    WorkerModule,
    SimpleLoggerModule,
    StructuredLoggingModule,
    HealthModule,
    LlmModule,
    ContentModerationModule,
    EvaluateModule,
    ContradictionModule,
    ProfilesModule,
    MeProfileModule,
    AdminModule,
    ReportsModule,
    MeAccountModule,
    MessagingRealtimeModule,
    MatchesModule,
    HolyGrailMatchingModule,
    SessionModule,
    AuthModule,
    LegacyBackendModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
