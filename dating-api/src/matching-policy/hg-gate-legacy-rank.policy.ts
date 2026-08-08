import { Injectable } from '@nestjs/common';
import { evaluateHolyGrailPairDirections } from '../matches/holy-grail-pair-directions';
import { compareWithStatus } from '../matches/match-engine';
import {
  MATCH_RANKING_CONTRACT,
  type MatchRankingContractId,
} from '../matches/match-ranking-contract';
import type {
  PairMatchPolicy,
  PairMatchPolicyInput,
  PairMatchPolicyResult,
} from './pair-match-policy';

/**
 * Product default: HG Layer-3 hard gate + legacy `compareWithStatus` rank
 * (`HG_GATE_LEGACY_RANK_V1`). Pure — no Prisma.
 */
@Injectable()
export class HgGateLegacyRankPolicy implements PairMatchPolicy {
  readonly id: MatchRankingContractId = MATCH_RANKING_CONTRACT;

  evaluate(input: PairMatchPolicyInput): PairMatchPolicyResult {
    const hgDirections = evaluateHolyGrailPairDirections(
      input.viewerHgRow,
      input.candidateHgRow,
    );
    const isHardFail =
      hgDirections != null &&
      (hgDirections.aToB.overallHardEligibility === 'FAIL' ||
        hgDirections.bToA.overallHardEligibility === 'FAIL');

    const compareResult = compareWithStatus(
      input.viewerEnginePayload,
      input.candidateEnginePayload,
    );

    if ('status' in compareResult) {
      return {
        contractId: MATCH_RANKING_CONTRACT,
        gate: { hgDirections, isHardFail },
        score: {
          matchScore: null,
          explainability: null,
          recommendation: null,
          scoreGuarded: true,
        },
      };
    }

    return {
      contractId: MATCH_RANKING_CONTRACT,
      gate: { hgDirections, isHardFail },
      score: {
        matchScore: compareResult.finalScore,
        explainability: compareResult.explainability,
        recommendation: compareResult.recommendation,
        scoreGuarded: false,
      },
    };
  }
}
