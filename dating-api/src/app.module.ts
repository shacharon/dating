import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { LlmModule } from './llm/llm.module';
import { MatchesModule } from './matches/matches.module';

@Module({
  imports: [HealthModule, LlmModule, MatchesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
