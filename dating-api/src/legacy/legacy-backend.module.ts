import { Global, Module } from '@nestjs/common';
import { ContradictionModule } from '../contradiction/contradiction.module';
import { EvaluateModule } from '../evaluate/evaluate.module';
import { AdminLegacyMatchesModule } from '../admin-legacy/matches/admin-legacy-matches.module';
import { ProfilesModule } from '../profiles/profiles.module';
import {
  DefaultLegacyBackendAdapter,
  LegacyBackendAdapter,
} from './legacy-backend.adapter';

@Global()
@Module({
  imports: [
    AdminLegacyMatchesModule,
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
