import { Inject, Injectable } from '@nestjs/common';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import {
  PAIR_MATCH_POLICY,
  type PairMatchPolicy,
} from '../matching-policy/pair-match-policy';
import type {
  CompareGuardFailureResultDto,
  CompareResultDto,
} from './match-engine';
import { compareWithStatus } from './match-engine';
import {
  directionsMutualHardPass,
  profileWithNeutralSelfSignalsFallback,
  type HolyGrailPairDirections,
} from './compare-hg-first-helpers';
import type { ChildrenUnsureProfileRow } from './children-unsure-profile-row.types';

export type AdminPairCompareInput = {
  readonly rowA: ChildrenUnsureProfileRow;
  readonly rowB: ChildrenUnsureProfileRow;
  readonly profileA: ProfileJsonPayload;
  readonly profileB: ProfileJsonPayload;
};

export type AdminPairCompareOutput = {
  readonly hgDirections: HolyGrailPairDirections | null;
  readonly result: CompareResultDto | CompareGuardFailureResultDto;
};

/**
 * Admin compare hub adapter: gate + baseline score via `PairMatchPolicy`, then
 * recover the full compare/guard DTO for HTTP assembly, then optional HG-first
 * neutral-signal retry (admin-only; outside the policy).
 *
 * Note: `policy.evaluate` already runs `compareWithStatus` internally; a second
 * call recovers the full `CompareResultDto` / guard envelope (policy score port
 * only exposes matchScore / explainability / recommendation).
 */
@Injectable()
export class AdminPairMatchEvaluator {
  constructor(
    @Inject(PAIR_MATCH_POLICY) private readonly pairMatchPolicy: PairMatchPolicy,
  ) {}

  evaluateCompare(input: AdminPairCompareInput): AdminPairCompareOutput {
    const evaluated = this.pairMatchPolicy.evaluate({
      viewerHgRow: input.rowA,
      candidateHgRow: input.rowB,
      viewerEnginePayload: input.profileA,
      candidateEnginePayload: input.profileB,
    });
    const hgDirections = evaluated.gate.hgDirections;

    // Parity: recover full READY fields or guard status/message (policy score is slim).
    let result: CompareResultDto | CompareGuardFailureResultDto =
      compareWithStatus(input.profileA, input.profileB);

    if (
      'status' in result &&
      result.status === 'INSUFFICIENT_DATA' &&
      hgDirections &&
      directionsMutualHardPass(hgDirections)
    ) {
      const aP = profileWithNeutralSelfSignalsFallback(input.profileA);
      const bP = profileWithNeutralSelfSignalsFallback(input.profileB);
      const retry = compareWithStatus(aP, bP);
      if (!('status' in retry)) {
        result = retry;
        if (result.debug) {
          result.debug = {
            ...result.debug,
            provenance: [
              ...(result.debug.provenance ?? []),
              'HG_FIRST_NEUTRAL_SIGNAL_LEGACY_FALLBACK',
            ],
          };
        }
      }
    }

    return { hgDirections, result };
  }
}
