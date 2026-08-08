import { Module } from '@nestjs/common';
import { HgGateLegacyRankPolicy } from './hg-gate-legacy-rank.policy';
import { PAIR_MATCH_POLICY } from './pair-match-policy';

@Module({
  providers: [
    HgGateLegacyRankPolicy,
    { provide: PAIR_MATCH_POLICY, useExisting: HgGateLegacyRankPolicy },
  ],
  exports: [PAIR_MATCH_POLICY, HgGateLegacyRankPolicy],
})
export class MatchingPolicyModule {}
