import {
  accumulateDealbreakerOutcomeCounts,
  countDealbreakerClassificationVolume,
  emptyDealbreakerTagOutcomeCounts,
  formatDealbreakerClassificationVolumeForLog,
  formatDealbreakerOutcomeCountsForLog,
  formatKillSwitchTagsForLog,
  hardConfidencePercentiles,
} from './dealbreaker-telemetry';
import type { HolyGrailDirectionalEvaluationResult } from './eligibility.evaluator';

function evalWithDb(
  dealbreakerDimensions: HolyGrailDirectionalEvaluationResult['dealbreakerDimensions'],
): HolyGrailDirectionalEvaluationResult {
  return {
    dimensions: {
      GENDER: { status: 'PASS', reasonCode: 'x' },
      AGE: { status: 'SKIPPED', reasonCode: 'x' },
      PROXIMITY: { status: 'SKIPPED', reasonCode: 'x' },
    },
    dealbreakerDimensions,
    overallHardEligibility: 'PASS',
    eligibilityFlags: { children_unsure: false },
  };
}

describe('dealbreaker-telemetry', () => {
  it('accumulates tag outcomes and formats log line', () => {
    const counts = emptyDealbreakerTagOutcomeCounts();
    accumulateDealbreakerOutcomeCounts(
      counts,
      evalWithDb({
        smoking: { status: 'FAIL', reasonCode: 'a' },
      }),
    );
    accumulateDealbreakerOutcomeCounts(
      counts,
      evalWithDb({
        smoking: { status: 'UNKNOWN', reasonCode: 'b' },
      }),
    );
    expect(formatDealbreakerOutcomeCountsForLog(counts)).toContain(
      'smoking:PASS=0,FAIL=1,UNKNOWN=1',
    );
  });

  it('counts classification volume and hard confidence percentiles', () => {
    const vol = countDealbreakerClassificationVolume([
      {
        tag: 'smoking',
        classification: 'HARD_EXCLUDE',
        evidence: 'x',
        confidence: 0.95,
      },
      {
        tag: 'smoking',
        classification: 'SOFT',
        evidence: 'y',
        confidence: 0.65,
      },
    ]);
    expect(formatDealbreakerClassificationVolumeForLog(vol)).toBe(
      'classifications=HARD_EXCLUDE=1,HARD_REQUIRE=0,SOFT=1',
    );
    expect(
      hardConfidencePercentiles([
        {
          tag: 'smoking',
          classification: 'HARD_EXCLUDE',
          evidence: 'x',
          confidence: 0.95,
        },
      ]),
    ).toEqual({ p50: 0.95, p90: 0.95 });
  });

  it('formats kill switch tags', () => {
    expect(formatKillSwitchTagsForLog(new Set())).toBe('killSwitchTags=none');
    expect(formatKillSwitchTagsForLog(new Set(['jealousy', 'smoking']))).toBe(
      'killSwitchTags=jealousy,smoking',
    );
  });
});
