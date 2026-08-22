import { Module } from '@nestjs/common';
import { AdminLegacyMatchesModule } from './matches/admin-legacy-matches.module';

@Module({
  imports: [AdminLegacyMatchesModule],
  exports: [AdminLegacyMatchesModule],
})
export class AdminLegacyModule {}
