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
import { LlmModule } from './llm/llm.module';
import { HolyGrailMatchingModule } from './holy-grail-matching/holy-grail-matching.module';
import { MatchesModule } from './matches/matches.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PrismaModule } from './prisma/prisma.module';
import { SessionModule } from './session/session.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    AuthSessionConfigModule,
    PrismaModule,
    SimpleLoggerModule,
    LlmModule,
    EvaluateModule,
    ExtractionModule,
    ContradictionModule,
    ProfilesModule,
    MatchesModule,
    HolyGrailMatchingModule,
    SessionModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
