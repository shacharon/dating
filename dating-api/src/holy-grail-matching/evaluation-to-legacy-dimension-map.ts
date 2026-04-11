import type { HolyGrailDirectionalEvaluationResult } from './eligibility.evaluator';
import {
  HOLY_GRAIL_DIMENSION_KEYS,
  type HolyGrailDimensionKey,
} from './holy-grail-dimensions';
import {
  MatchingDimensionResults,
  type MatchingDimensionResult,
} from './matching-dimension-result';

/**
 * Layer 3 → Layer 4 bridge: maps evaluator outcomes to the legacy `MatchingDimensionResult`
 * shape expected by `buildHolyGrailPairDecisionV1` / `buildHolyGrailEligibilityAuditV1`.
 * `reasonCode`, `overallHardEligibility`, and `eligibilityFlags` stay on `HolyGrailDirectionalEvaluationResult` only.
 *
 * Layer 3 `SKIPPED` → `SKIPPED` (not `UNKNOWN`) so pair-decision can ignore ineligible dimensions.
 */
export function adaptHolyGrailEvaluationToLegacyDimensionMap(
  evaluation: HolyGrailDirectionalEvaluationResult,
): Record<HolyGrailDimensionKey, MatchingDimensionResult> {
  const out = {} as Record<HolyGrailDimensionKey, MatchingDimensionResult>;
  for (const key of HOLY_GRAIL_DIMENSION_KEYS) {
    const status = evaluation.dimensions[key].status;
    if (status === 'PASS' || status === 'SOFT_PASS') {
      out[key] = MatchingDimensionResults.MATCH;
    } else if (status === 'FAIL') {
      out[key] = MatchingDimensionResults.NO_MATCH;
    } else {
      out[key] = MatchingDimensionResults.SKIPPED;
    }
  }
  return out;
}
