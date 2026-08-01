import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MatchDaemonService } from './match-daemon.service';
import { MatchesApiController } from './matches-api.controller';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';

@Module({
  imports: [SimpleLoggerModule, ProfilesModule, AuthModule, AdminAuthModule],
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
