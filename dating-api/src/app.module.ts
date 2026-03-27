import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContradictionModule } from './contradiction/contradiction.module';
import { EvaluateModule } from './evaluate/evaluate.module';
import { ExtractionModule } from './extraction/extraction.module';
import { SimpleLoggerModule } from './logger/simple-logger.module';
import { LlmModule } from './llm/llm.module';
import { MatchesModule } from './matches/matches.module';
import { ProfilesModule } from './profiles/profiles.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    PrismaModule,
    SimpleLoggerModule,
    LlmModule,
    EvaluateModule,
    ExtractionModule,
    ContradictionModule,
    ProfilesModule,
    MatchesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
