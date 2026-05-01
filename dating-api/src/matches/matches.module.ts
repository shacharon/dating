import { Module } from '@nestjs/common';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MatchDaemonService } from './match-daemon.service';
import { MatchesApiController } from './matches-api.controller';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';

@Module({
  imports: [SimpleLoggerModule, ProfilesModule],
  controllers: [MatchesController, MatchesApiController],
  providers: [
    MatchesService,
    MatchDaemonService,
    HolyGrailPairSnapshotTelemetryService,
  ],
  exports: [
    MatchesService,
    MatchDaemonService,
  ],
})
export class MatchesModule {}
