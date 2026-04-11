import {
  HOLY_GRAIL_DIMENSION_KEYS,
  type HolyGrailDimensionKey,
} from '../holy-grail-dimensions';
import {
  MatchingDimensionResults,
  type MatchingDimensionResult,
} from '../matching-dimension-result';
import {
  HolyGrailPairDecisions,
  type HolyGrailPairDecisionV1,
  type HolyGrailPairDecision,
} from './holy-grail-decision.types';

type DimensionMap = Record<HolyGrailDimensionKey, MatchingDimensionResult>;

function hasHardBlock(m: DimensionMap): boolean {
  return HOLY_GRAIL_DIMENSION_KEYS.some(
    (k) => m[k] === MatchingDimensionResults.NO_MATCH,
  );
}

/** Direction satisfies hard prefs: every dimension is MATCH or SKIPPED (ignored), no UNKNOWN/NOT_ENFORCEABLE. */
function directionHardEligible(m: DimensionMap): boolean {
  return HOLY_GRAIL_DIMENSION_KEYS.every((k) => {
    const r = m[k];
    return (
      r === MatchingDimensionResults.MATCH ||
      r === MatchingDimensionResults.SKIPPED
    );
  });
}

function decidePair(
  stc: DimensionMap,
  cts: DimensionMap,
): HolyGrailPairDecision {
  if (hasHardBlock(stc) || hasHardBlock(cts)) {
    return HolyGrailPairDecisions.NO_MATCH;
  }
  if (directionHardEligible(stc) && directionHardEligible(cts)) {
    return HolyGrailPairDecisions.MUTUAL_MATCH;
  }
  return HolyGrailPairDecisions.INDETERMINATE;
}

/**
 * Layer 4 — Deterministic conjunction of two directional evaluations (Step 3 semantics).
 * `NO_MATCH` blocks the pair. `SKIPPED` is ignored for eligibility. `UNKNOWN` / `NOT_ENFORCEABLE` block MUTUAL_MATCH.
 * Does not call LLMs or legacy match-engine.
 */
export function buildHolyGrailPairDecisionV1(args: {
  searcherProfileId: string;
  counterpartyProfileId: string;
  searcherToCounterparty: DimensionMap;
  counterpartyToSearcher: DimensionMap;
}): HolyGrailPairDecisionV1 {
  return {
    decisionVersion: 'holy_grail_pair_decision_v1',
    decision: decidePair(
      args.searcherToCounterparty,
      args.counterpartyToSearcher,
    ),
    searcherProfileId: args.searcherProfileId,
    counterpartyProfileId: args.counterpartyProfileId,
  };
}
