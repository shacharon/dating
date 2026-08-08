import type { ChildrenUnsureProfileRow } from '../matches/children-unsure-profile-row.types';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import type {
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from '../matches/match-engine';
import type { MatchRankingContractId } from '../matches/match-ranking-contract';
import type { HolyGrailDirectionalEvaluationResult } from '../holy-grail-matching/eligibility.evaluator';

export const PAIR_MATCH_POLICY = Symbol('PAIR_MATCH_POLICY');

export type PairMatchPolicyInput = {
  viewerHgRow: ChildrenUnsureProfileRow;
  candidateHgRow: ChildrenUnsureProfileRow;
  viewerEnginePayload: ProfileJsonPayload;
  candidateEnginePayload: ProfileJsonPayload;
};

/** HG directions missing/throw → treat as non-hard-fail (lenient), same as today. */
export type PairMatchGateResult = {
  hgDirections: {
    aToB: HolyGrailDirectionalEvaluationResult;
    bToA: HolyGrailDirectionalEvaluationResult;
  } | null;
  /** Either direction overallHardEligibility === 'FAIL' when directions non-null. */
  isHardFail: boolean;
};

export type PairMatchScoreResult = {
  matchScore: number | null;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /** true when compareWithStatus returned a guard (`'status' in result`). */
  scoreGuarded: boolean;
};

export type PairMatchPolicyResult = {
  contractId: MatchRankingContractId;
  gate: PairMatchGateResult;
  score: PairMatchScoreResult;
};

export interface PairMatchPolicy {
  readonly id: MatchRankingContractId;
  evaluate(input: PairMatchPolicyInput): PairMatchPolicyResult;
}
