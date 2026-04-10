import { MatchingDimensionResults } from './matching-dimension-result';
import { HOLY_GRAIL_DIMENSION_KEYS } from './holy-grail-dimensions';
import type { HolyGrailDirectionalEvaluationResult } from './eligibility.evaluator';
import { adaptHolyGrailEvaluationToLegacyDimensionMap } from './evaluation-to-legacy-dimension-map';

function evalResult(
  dims: HolyGrailDirectionalEvaluationResult['dimensions'],
): HolyGrailDirectionalEvaluationResult {
  const children_unsure = dims.PARTNER_WANTS_CHILDREN.status === 'SOFT_PASS';
  return { dimensions: dims, overallHardEligibility: 'PASS', eligibilityFlags: { children_unsure } };
}

describe('adaptHolyGrailEvaluationToLegacyDimensionMap', () => {
  it('maps mixed PASS / FAIL / SKIPPED to MATCH / NO_MATCH / UNKNOWN', () => {
    const base = Object.fromEntries(
      HOLY_GRAIL_DIMENSION_KEYS.map((k) => [
        k,
        { status: 'SKIPPED' as const, reasonCode: 'X' },
      ]),
    ) as HolyGrailDirectionalEvaluationResult['dimensions'];
    base.GENDER = { status: 'PASS', reasonCode: 'G' };
    base.AGE = { status: 'FAIL', reasonCode: 'A' };
    base.RELIGION = { status: 'SKIPPED', reasonCode: 'R' };

    const legacy = adaptHolyGrailEvaluationToLegacyDimensionMap(evalResult(base));
    expect(legacy.GENDER).toBe(MatchingDimensionResults.MATCH);
    expect(legacy.AGE).toBe(MatchingDimensionResults.NO_MATCH);
    expect(legacy.RELIGION).toBe(MatchingDimensionResults.SKIPPED);
    for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
      if (k === 'GENDER' || k === 'AGE' || k === 'RELIGION') continue;
      expect(legacy[k]).toBe(MatchingDimensionResults.SKIPPED);
    }
  });

  it('all SKIPPED -> all SKIPPED in legacy map', () => {
    const dims = Object.fromEntries(
      HOLY_GRAIL_DIMENSION_KEYS.map((k) => [
        k,
        { status: 'SKIPPED' as const, reasonCode: 'SKIP' },
      ]),
    ) as HolyGrailDirectionalEvaluationResult['dimensions'];
    const legacy = adaptHolyGrailEvaluationToLegacyDimensionMap(evalResult(dims));
    for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
      expect(legacy[k]).toBe(MatchingDimensionResults.SKIPPED);
    }
  });

  it('SOFT_PASS maps to MATCH (same as PASS for Layer 4)', () => {
    const dims = Object.fromEntries(
      HOLY_GRAIL_DIMENSION_KEYS.map((k) => [
        k,
        { status: 'SKIPPED' as const, reasonCode: 'SKIP' },
      ]),
    ) as HolyGrailDirectionalEvaluationResult['dimensions'];
    dims.PARTNER_WANTS_CHILDREN = {
      status: 'SOFT_PASS',
      reasonCode: 'WANTS_CHILDREN_MUST_WANT_UNSURE_SOFT',
    };
    const legacy = adaptHolyGrailEvaluationToLegacyDimensionMap(evalResult(dims));
    expect(legacy.PARTNER_WANTS_CHILDREN).toBe(MatchingDimensionResults.MATCH);
  });

  it('FAIL preserved exactly as NO_MATCH', () => {
    const dims = Object.fromEntries(
      HOLY_GRAIL_DIMENSION_KEYS.map((k) => [
        k,
        { status: 'FAIL' as const, reasonCode: 'F' },
      ]),
    ) as HolyGrailDirectionalEvaluationResult['dimensions'];
    const legacy = adaptHolyGrailEvaluationToLegacyDimensionMap(evalResult(dims));
    for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
      expect(legacy[k]).toBe(MatchingDimensionResults.NO_MATCH);
    }
  });
});
