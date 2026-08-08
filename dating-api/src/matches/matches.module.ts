import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { MatchingPolicyModule } from '../matching-policy/matching-policy.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { AdminPairMatchEvaluator } from './admin-pair-match.evaluator';
import { MatchDaemonService } from './match-daemon.service';
import { MatchesApiController } from './matches-api.controller';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { HolyGrailPairSnapshotTelemetryService } from './holy-grail-pair-snapshot-telemetry.service';

@Module({
  imports: [
    SimpleLoggerModule,
    ProfilesModule,
    AuthModule,
    AdminAuthModule,
    MatchingPolicyModule,
  ],
  controllers: [MatchesController, MatchesApiController],
  providers: [
    MatchesService,
    AdminPairMatchEvaluator,
    MatchDaemonService,
    HolyGrailPairSnapshotTelemetryService,
  ],
  exports: [
    MatchesService,
    MatchDaemonService,
  ],
})
export class MatchesModule {}