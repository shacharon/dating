import { Global, Module } from '@nestjs/common';
import { ContradictionModule } from '../contradiction/contradiction.module';
import { EvaluateModule } from '../evaluate/evaluate.module';
import { MatchesModule } from '../matches/matches.module';
import { ProfilesModule } from '../profiles/profiles.module';
import {
  DefaultLegacyBackendAdapter,
  LegacyBackendAdapter,
} from './legacy-backend.adapter';

@Global()
@Module({
  imports: [
    MatchesModule,
    EvaluateModule,
    ContradictionModule,
    ProfilesModule,
  ],
  providers: [
    DefaultLegacyBackendAdapter,
    {
      provide: LegacyBackendAdapter,
      useExisting: DefaultLegacyBackendAdapter,
    },
  ],
  exports: [LegacyBackendAdapter],
})
export class LegacyBackendModule {}
