import { MatchingDimensionResults } from './matching-dimension-result';
import { HOLY_GRAIL_DIMENSION_KEYS } from './holy-grail-dimensions';
import type { HolyGrailDirectionalEvaluationResult } from './eligibility.evaluator';
import { adaptHolyGrailEvaluationToLegacyDimensionMap } from './evaluation-to-legacy-dimension-map';

function baseDims(): HolyGrailDirectionalEvaluationResult['dimensions'] {
  return {
    GENDER: { status: 'PASS', reasonCode: 'G' },
    AGE: { status: 'PASS', reasonCode: 'A' },
    PROXIMITY: { status: 'SKIPPED', reasonCode: 'P' },
  };
}

describe('adaptHolyGrailEvaluationToLegacyDimensionMap', () => {
  it('maps PASS → MATCH, FAIL → NO_MATCH, SKIPPED → SKIPPED', () => {
    const evaluation: HolyGrailDirectionalEvaluationResult = {
      dimensions: {
        GENDER: { status: 'PASS', reasonCode: 'ok' },
        AGE: { status: 'FAIL', reasonCode: 'bad' },
        PROXIMITY: { status: 'SKIPPED', reasonCode: 'geo' },
      },
      dealbreakerDimensions: {},
      overallHardEligibility: 'FAIL',
      eligibilityFlags: { children_unsure: false },
    };
    const legacy = adaptHolyGrailEvaluationToLegacyDimensionMap(evaluation);
    expect(legacy.GENDER).toBe(MatchingDimensionResults.MATCH);
    expect(legacy.AGE).toBe(MatchingDimensionResults.NO_MATCH);
    expect(legacy.PROXIMITY).toBe(MatchingDimensionResults.SKIPPED);
    expect(Object.keys(legacy).sort()).toEqual(
      [...HOLY_GRAIL_DIMENSION_KEYS].sort(),
    );
  });

  it('maps SOFT_PASS → MATCH (does not block)', () => {
    const dims = baseDims();
    dims.GENDER = { status: 'SOFT_PASS', reasonCode: 'soft' };
    const evaluation: HolyGrailDirectionalEvaluationResult = {
      dimensions: dims,
      dealbreakerDimensions: {},
      overallHardEligibility: 'PASS',
      eligibilityFlags: { children_unsure: false },
    };
    const legacy = adaptHolyGrailEvaluationToLegacyDimensionMap(evaluation);
    expect(legacy.GENDER).toBe(MatchingDimensionResults.MATCH);
  });

  it('maps UNKNOWN → UNKNOWN (Sprint 16 Story 1)', () => {
    const dims = baseDims();
    dims.GENDER = {
      status: 'UNKNOWN',
      reasonCode: 'PARTNER_GENDER_MISSING_OR_WITHHELD',
    };
    const evaluation: HolyGrailDirectionalEvaluationResult = {
      dimensions: dims,
      dealbreakerDimensions: {},
      overallHardEligibility: 'FAIL',
      eligibilityFlags: { children_unsure: false },
    };
    const legacy = adaptHolyGrailEvaluationToLegacyDimensionMap(evaluation);
    expect(legacy.GENDER).toBe(MatchingDimensionResults.UNKNOWN);
    expect(legacy.GENDER).not.toBe(MatchingDimensionResults.SKIPPED);
    expect(legacy.GENDER).not.toBe(MatchingDimensionResults.NO_MATCH);
  });
});
