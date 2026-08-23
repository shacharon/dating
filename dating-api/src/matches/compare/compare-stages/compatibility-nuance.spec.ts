import { computeCompatibilityAndNuancePenalties } from './compatibility-nuance';
import {
  COVERAGE_COMPAT_CEILING_BASE,
  LOW_EVIDENCE_COVERAGE_PERCENT,
  NUANCE_PENALTY,
} from '../../engine/matching-algorithm.constants';

describe('computeCompatibilityAndNuancePenalties', () => {
  const emptySignals: Record<string, number | null> = {};

  it('returns blended compatibility when coverage is strong and no nuance gaps', () => {
    const score = computeCompatibilityAndNuancePenalties(
      80,
      80,
      70,
      70,
      90,
      emptySignals,
      emptySignals,
      50,
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('applies coverage ceiling under low-evidence coverage', () => {
    const coverage = LOW_EVIDENCE_COVERAGE_PERCENT;
    const uncapped = computeCompatibilityAndNuancePenalties(
      95,
      95,
      95,
      85,
      100,
      emptySignals,
      emptySignals,
      100,
    );
    const capped = computeCompatibilityAndNuancePenalties(
      95,
      95,
      95,
      85,
      coverage,
      emptySignals,
      emptySignals,
      100,
    );
    const ceiling = COVERAGE_COMPAT_CEILING_BASE + coverage;
    expect(capped).toBeLessThanOrEqual(ceiling);
    expect(capped).toBeLessThanOrEqual(uncapped);
  });

  it('applies nuance penalty for relationshipClarity gap in band', () => {
    // Gap must be within [NUANCE_GAP_MIN, NUANCE_GAP_MAX] (see matching-algorithm.constants).
    const baseSignalsA = { relationshipClarity: 3 };
    const baseSignalsB = { relationshipClarity: 3 };
    const gapSignalsA = { relationshipClarity: 3 };
    const gapSignalsB = { relationshipClarity: 3 + 3 }; // gap = 3

    const without = computeCompatibilityAndNuancePenalties(
      80,
      80,
      70,
      70,
      90,
      baseSignalsA,
      baseSignalsB,
      50,
    );
    const withGap = computeCompatibilityAndNuancePenalties(
      80,
      80,
      70,
      70,
      90,
      gapSignalsA,
      gapSignalsB,
      50,
    );
    expect(withGap).toBe(Math.max(0, without - NUANCE_PENALTY));
  });
});
