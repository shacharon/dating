/**
 * Unit tests for the deterministic scoring model.
 * Formulas: compatibility, coverageFactor, frictionPenalty, raw, finalScore.
 */

import {
  clamp,
  compatibility,
  COMPATIBILITY_BLEND_WEIGHTS,
  finalScore,
  rawScore,
  FRICTION_SCALE,
} from './scoring';
import { computeValuesAlignment } from '../compatibility/compatibility-score';
import type { SignalKey, SignalValue, SignalsMap } from '../compatibility/compatibility-score';
import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import { coverageFactor, coveragePercent, scoreCoverageFactor } from './coverage';
import { frictionPenalty } from './friction';

function fullMap(overrides: Partial<Record<SignalKey, SignalValue>>): SignalsMap {
  const out: Record<string, SignalValue> = {};
  for (const k of COMPATIBILITY_SIGNAL_KEYS) {
    out[k] = overrides[k] ?? 5;
  }
  return out as SignalsMap;
}

describe('engine scoring', () => {
  describe('clamp', () => {
    it('returns v when within [min, max]', () => {
      expect(clamp(50, 0, 100)).toBe(50);
    });
    it('returns min when v < min', () => {
      expect(clamp(-1, 0, 100)).toBe(0);
    });
    it('returns max when v > max', () => {
      expect(clamp(101, 0, 100)).toBe(100);
    });
  });

  describe('compatibility', () => {
    it('COMPATIBILITY_BLEND_WEIGHTS sum to 1', () => {
      const sum = Object.values(COMPATIBILITY_BLEND_WEIGHTS).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1, 10);
    });

    it('0.30*A_to_B + 0.30*B_to_A + 0.25*relationshipFit + 0.15*valuesAlignment', () => {
      const c = compatibility(80, 80, 60, 70);
      expect(c).toBe(
        0.3 * 80 + 0.3 * 80 + 0.25 * 60 + 0.15 * 70,
      );
      expect(c).toBe(73.5);
    });

    it('tier1 spirituality gap lowers compatibility more than tier3-only gap', () => {
      const dir = 70;
      const rel = 60;
      const tier1GapValues = computeValuesAlignment(
        fullMap({ spirituality: 2 }),
        fullMap({ spirituality: 9 }),
      );
      const tier3GapValues = computeValuesAlignment(
        fullMap({ physicalPriority: 5 }),
        fullMap({ physicalPriority: 2 }),
      );
      expect(tier3GapValues).toBeGreaterThan(tier1GapValues);
      const compatTier1 = compatibility(dir, dir, rel, tier1GapValues);
      const compatTier3 = compatibility(dir, dir, rel, tier3GapValues);
      expect(compatTier1).toBeLessThan(compatTier3);
    });
  });

  describe('coverageFactor', () => {
    it('0.7 + 0.3 * (coveragePercent/100), confidence weighting 70–100%', () => {
      expect(coverageFactor(0)).toBeCloseTo(0.7, 10);
      expect(coverageFactor(100)).toBeCloseTo(1, 10);
      expect(coverageFactor(70)).toBeCloseTo(0.7 + 0.3 * 0.7, 10);
      expect(coverageFactor(70)).toBeGreaterThan(0.9);
    });
    it('at 40% is 0.82', () => {
      expect(coverageFactor(40)).toBeCloseTo(0.7 + 0.3 * 0.4, 5);
      expect(coverageFactor(40)).toBe(0.82);
    });
    it('at 10% is 0.73 (no longer punitive)', () => {
      expect(coverageFactor(10)).toBeCloseTo(0.73, 5);
    });
  });

  describe('coveragePercent', () => {
    it('round(100 * numComparableSignals / totalSignals)', () => {
      expect(coveragePercent(7, 10)).toBe(70);
      expect(coveragePercent(1, 14)).toBe(7);
    });
  });

  describe('scoreCoverageFactor', () => {
    it('is monotonic and gentler than previous low-coverage line', () => {
      const p29 = scoreCoverageFactor(29);
      const p36 = scoreCoverageFactor(36);
      const p43 = scoreCoverageFactor(43);
      const p50 = scoreCoverageFactor(50);
      const p57 = scoreCoverageFactor(57);

      // monotonic: more coverage should not reduce match score
      expect(p29).toBeLessThanOrEqual(p36);
      expect(p36).toBeLessThanOrEqual(p43);
      expect(p43).toBeLessThanOrEqual(p50);
      expect(p50).toBeLessThanOrEqual(p57);

      // low coverage still penalizes score
      expect(p29).toBeLessThan(1);
      expect(p36).toBeLessThan(1);
      expect(p43).toBeLessThan(1);

      // but less aggressively than previous formula (0.88 + 0.12 * c)
      const old = (c: number) => 0.88 + 0.12 * (c / 100);
      expect(p29).toBeGreaterThan(old(29));
      expect(p36).toBeGreaterThan(old(36));
      expect(p43).toBeGreaterThan(old(43));
    });
  });

  describe('frictionPenalty', () => {
    it('capped linear with high-friction softening (friction>=4 => *0.9)', () => {
      expect(frictionPenalty(0)).toBe(0);
      expect(frictionPenalty(3)).toBe(9);
      expect(frictionPenalty(7)).toBeCloseTo(18.9, 10);
      expect(frictionPenalty(10)).toBe(22.5);
    });
  });

  describe('rawScore and finalScore', () => {
    it('raw = compatibility * scoreCoverageFactor - frictionPenaltyScaled; finalScore = clamp(round(raw), 0, 100)', () => {
      const raw = rawScore(75, 0.82, 0);
      expect(raw).toBeCloseTo(75 * 0.82 - 0, 5);
      expect(finalScore(raw)).toBeGreaterThanOrEqual(61);
      expect(finalScore(raw)).toBeLessThanOrEqual(62);
    });
    it('finalScore is always in 0..100 for any raw', () => {
      const raws = [-100, -1, 0, 50, 99, 100, 101, 200];
      for (const r of raws) {
        const s = finalScore(r);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    });
    it('when frictionPenalty>0, FRICTION_SCALE increases finalScore (monotonic)', () => {
      const compat = 80;
      const cf = 0.9;
      const fp = 10;
      const rawWithScaling = rawScore(compat, cf, fp); // uses fp * FRICTION_SCALE
      const rawWithoutScaling = compat * cf - fp;
      expect(rawWithScaling).toBeGreaterThan(rawWithoutScaling);
      expect(finalScore(rawWithScaling)).toBeGreaterThanOrEqual(finalScore(rawWithoutScaling));
    });
  });

  describe('Case 1 – no friction', () => {
    const aToB = 80;
    const bToA = 80;
    const relationshipFit = 60;
    const valuesAlignment = 70;
    const coveragePercentValue = 55; // coverageFactor = 0.7 + 0.3*0.55 = 0.865
    const frictionValue = 0;

    it('compatibility ≈ 73–74', () => {
      const c = compatibility(aToB, bToA, relationshipFit, valuesAlignment);
      expect(c).toBe(73.5);
      expect(c).toBeGreaterThanOrEqual(73);
    });
    it('coverageFactor = 0.865 when coveragePercent = 55', () => {
      const cf = coverageFactor(coveragePercentValue);
      expect(cf).toBeCloseTo(0.865, 2);
    });
    it('finalScore between 55–70', () => {
      const c = compatibility(aToB, bToA, relationshipFit, valuesAlignment);
      const cf = coverageFactor(coveragePercentValue);
      const fp = frictionPenalty(frictionValue);
      const raw = rawScore(c, cf, fp);
      const score = finalScore(raw);
      expect(score).toBeGreaterThanOrEqual(55);
      expect(score).toBeLessThanOrEqual(70);
    });
  });

  describe('Case 2 – high friction', () => {
    const aToB = 80;
    const bToA = 80;
    const relationshipFit = 60;
    const valuesAlignment = 70;
    const coveragePercentValue = 70;
    const frictionValue = 7;

    it('finalScore reduced by softened high-friction penalty, not zeroed', () => {
      const c = compatibility(aToB, bToA, relationshipFit, valuesAlignment);
      const cf = coverageFactor(coveragePercentValue);
      const fp = frictionPenalty(frictionValue);
      expect(fp).toBeCloseTo(18.9, 10);
      const raw = rawScore(c, cf, fp);
      const score = finalScore(raw);
      expect(score).toBeGreaterThanOrEqual(45);
      expect(score).toBeLessThan(70);
    });
  });

  describe('Case 3 – low coverage', () => {
    const coveragePercentValue = 10;
    const compatibilityValue = 75;
    const frictionValue = 0;

    it('coverageFactor = 0.73 (confidence weighting, not punitive)', () => {
      const cf = coverageFactor(coveragePercentValue);
      expect(cf).toBeCloseTo(0.73, 2);
    });
    it('finalScore remains high when coverage is low (confidence carries sparsity)', () => {
      const cf = 0.85 + 0.15 * (coveragePercentValue / 100);
      const fp = frictionPenalty(frictionValue);
      const raw = rawScore(compatibilityValue, cf, fp);
      const score = finalScore(raw);
      expect(score).toBeGreaterThanOrEqual(64);
      expect(score).toBeLessThanOrEqual(66);
    });
  });

  describe('Tier coverage – physicalPriority match alone', () => {
    it('low Tier1 coverage still yields strong score; confidence tracks reliability', () => {
      const covPercent = coveragePercent(1, 14);
      const confidence = coverageFactor(covPercent);
      expect(confidence).toBeCloseTo(0.7 + 0.3 * (7 / 100), 2);
      const scoreCf = 0.85 + 0.15 * (covPercent / 100);
      expect(scoreCf).toBeCloseTo(0.8605, 2);

      const compat = compatibility(100, 100, 0, 0);
      expect(compat).toBe(60);

      const fp = frictionPenalty(0);
      const raw = rawScore(compat, scoreCf, fp);
      const score = finalScore(raw);
      expect(score).toBeGreaterThan(50);
      expect(score).toBeLessThan(55);
    });
  });
});

