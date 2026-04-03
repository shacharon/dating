import { Module } from '@nestjs/common';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MatchDaemonService } from './match-daemon.service';
import { MatchesAnalyticsService } from './matches-analytics.service';
import { MatchesApiController } from './matches-api.controller';
import { MatchesController } from './matches.controller';
import { MatchesScanService } from './matches-scan.service';
import { MatchesService } from './matches.service';

@Module({
  imports: [SimpleLoggerModule, ProfilesModule],
  controllers: [MatchesController, MatchesApiController],
  providers: [
    MatchesService,
    MatchDaemonService,
    MatchesAnalyticsService,
    MatchesScanService,
  ],
  exports: [MatchesService],
})
export class MatchesModule {}
