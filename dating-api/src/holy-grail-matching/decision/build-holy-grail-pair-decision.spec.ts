import { HOLY_GRAIL_DIMENSION_KEYS } from '../holy-grail-dimensions';
import { MatchingDimensionResults, type MatchingDimensionResult } from '../matching-dimension-result';
import { buildHolyGrailPairDecisionV1 } from './build-holy-grail-pair-decision';
import { HolyGrailPairDecisions } from './holy-grail-decision.types';

function fill(each: MatchingDimensionResult): Record<(typeof HOLY_GRAIL_DIMENSION_KEYS)[number], MatchingDimensionResult> {
  return Object.fromEntries(HOLY_GRAIL_DIMENSION_KEYS.map((k) => [k, each])) as Record<
    (typeof HOLY_GRAIL_DIMENSION_KEYS)[number],
    MatchingDimensionResult
  >;
}

function decide(
  stc: Record<(typeof HOLY_GRAIL_DIMENSION_KEYS)[number], MatchingDimensionResult>,
  cts: Record<(typeof HOLY_GRAIL_DIMENSION_KEYS)[number], MatchingDimensionResult>,
) {
  return buildHolyGrailPairDecisionV1({
    searcherProfileId: 'a',
    counterpartyProfileId: 'b',
    searcherToCounterparty: stc,
    counterpartyToSearcher: cts,
  }).decision;
}

describe('buildHolyGrailPairDecisionV1', () => {
  it('all SKIPPED both directions => MUTUAL_MATCH (hard eligibility not blocked)', () => {
    const m = fill(MatchingDimensionResults.SKIPPED);
    expect(decide(m, m)).toBe(HolyGrailPairDecisions.MUTUAL_MATCH);
  });

  it('mixed MATCH + SKIPPED in both directions => MUTUAL_MATCH', () => {
    const stc = fill(MatchingDimensionResults.SKIPPED);
    stc.GENDER = MatchingDimensionResults.MATCH;
    const cts = fill(MatchingDimensionResults.SKIPPED);
    cts.GENDER = MatchingDimensionResults.MATCH;
    expect(decide(stc, cts)).toBe(HolyGrailPairDecisions.MUTUAL_MATCH);
  });

  it('one NO_MATCH in either direction => NO_MATCH', () => {
    const ok = fill(MatchingDimensionResults.SKIPPED);
    const blocked = fill(MatchingDimensionResults.SKIPPED);
    blocked.GENDER = MatchingDimensionResults.NO_MATCH;
    expect(decide(blocked, ok)).toBe(HolyGrailPairDecisions.NO_MATCH);
    expect(decide(ok, blocked)).toBe(HolyGrailPairDecisions.NO_MATCH);
  });

  it('legacy UNKNOWN (not SKIPPED) => INDETERMINATE, not MUTUAL_MATCH', () => {
    const stc = fill(MatchingDimensionResults.SKIPPED);
    stc.AGE = MatchingDimensionResults.UNKNOWN;
    const cts = fill(MatchingDimensionResults.SKIPPED);
    expect(decide(stc, cts)).toBe(HolyGrailPairDecisions.INDETERMINATE);
  });

  it('NOT_ENFORCEABLE => INDETERMINATE', () => {
    const stc = fill(MatchingDimensionResults.SKIPPED);
    stc.PROXIMITY = MatchingDimensionResults.NOT_ENFORCEABLE;
    const cts = fill(MatchingDimensionResults.SKIPPED);
    expect(decide(stc, cts)).toBe(HolyGrailPairDecisions.INDETERMINATE);
  });
});
