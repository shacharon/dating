import { join } from 'node:path';

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AuthSessionConfigModule } from './config/auth-session-config.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContradictionModule } from './contradiction/contradiction.module';
import { EvaluateModule } from './evaluate/evaluate.module';
import { ExtractionModule } from './extraction/extraction.module';
import { SimpleLoggerModule } from './logger/simple-logger.module';
import { StructuredLoggingModule } from './logging/structured-logging.module';
import { LlmModule } from './llm/llm.module';
import { HolyGrailMatchingModule } from './holy-grail-matching/holy-grail-matching.module';
import { LegacyBackendModule } from './legacy/legacy-backend.module';
import { MatchesModule } from './matches/matches.module';
import { MeProfileModule } from './me-profile/me-profile.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PrismaModule } from './prisma/prisma.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    // Resolve `.env` from the dating-api package root (compiled `dist/` or `src/`), not `process.cwd()`,
    // so DATABASE_URL loads when Nest is started from a parent directory or via tooling.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: join(__dirname, '..', '.env') }),
    AuthSessionConfigModule,
    PrismaModule,
    SimpleLoggerModule,
    StructuredLoggingModule,
    LlmModule,
    EvaluateModule,
    ExtractionModule,
    ContradictionModule,
    ProfilesModule,
    MeProfileModule,
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
