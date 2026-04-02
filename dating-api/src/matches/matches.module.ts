import { Module } from '@nestjs/common';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MatchDaemonService } from './match-daemon.service';
import { MatchesAnalyticsService } from './matches-analytics.service';
import { MatchesApiController } from './matches-api.controller';
import { MatchesController } from './matches.controller';
import { MatchesJsonService } from './matches-json.service';
import { MatchesScanService } from './matches-scan.service';
import { MatchesService } from './matches.service';

@Module({
  imports: [SimpleLoggerModule, ProfilesModule],
  controllers: [MatchesController, MatchesApiController],
  providers: [
    MatchesService,
    MatchesJsonService,
    MatchDaemonService,
    MatchesAnalyticsService,
    MatchesScanService,
  ],
  exports: [MatchesService],
})
export class MatchesModule {}
