import {
  clamp,
  coverageFactorFromPercent,
  computeCompatibilityFromComponents,
  frictionPenalty,
  computeFinalScore,
} from './scoring';
import { coverageFactor as engineCoverageFactor } from '../engine/coverage';
import {
  compatibility as engineCompatibility,
  finalScore as engineFinalScore,
  rawScore as engineRawScore,
} from '../engine/scoring';
import { frictionPenalty as engineFrictionPenalty } from '../engine/friction';

describe('scoring', () => {
  describe('clamp', () => {
    it('returns value when within [lo, hi]', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(0, 0, 100)).toBe(0);
      expect(clamp(100, 0, 100)).toBe(100);
    });
    it('clamps to lo when below', () => {
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(5, 10, 20)).toBe(10);
    });
    it('clamps to hi when above', () => {
      expect(clamp(150, 0, 100)).toBe(100);
      expect(clamp(25, 10, 20)).toBe(20);
    });
    it('handles reversed lo/hi', () => {
      expect(clamp(50, 100, 0)).toBe(50);
      expect(clamp(150, 100, 0)).toBe(100);
      expect(clamp(-10, 100, 0)).toBe(0);
    });
  });

  describe('coverageFactorFromPercent', () => {
    it('matches engine coverageFactor at 40%', () => {
      const at40 = coverageFactorFromPercent(40);
      expect(at40).toBeCloseTo(engineCoverageFactor(40), 10);
      expect(at40).toBeCloseTo(0.82, 10);
    });
    it('approaches 1 for high coverage', () => {
      expect(coverageFactorFromPercent(100)).toBeCloseTo(1, 10);
      expect(coverageFactorFromPercent(100)).toBeLessThanOrEqual(1);
    });
    it('has floor 0.7 for low coverage', () => {
      expect(coverageFactorFromPercent(0)).toBeCloseTo(0.7, 10);
      expect(coverageFactorFromPercent(0)).toBeGreaterThanOrEqual(0.7);
    });
    it('is strictly increasing', () => {
      const v0 = coverageFactorFromPercent(0);
      const v20 = coverageFactorFromPercent(20);
      const v40 = coverageFactorFromPercent(40);
      const v60 = coverageFactorFromPercent(60);
      const v100 = coverageFactorFromPercent(100);
      expect(v0).toBeLessThan(v20);
      expect(v20).toBeLessThan(v40);
      expect(v40).toBeLessThan(v60);
      expect(v60).toBeLessThan(v100);
    });
  });

  describe('computeCompatibilityFromComponents', () => {
    it('weighted sum: 0.35*A + 0.35*B + 0.25*R + 0.05*V', () => {
      const a = 100;
      const b = 100;
      const r = 100;
      const v = 100;
      expect(computeCompatibilityFromComponents(a, b, r, v)).toBe(100);
    });
    it('all zeros gives 0', () => {
      expect(computeCompatibilityFromComponents(0, 0, 0, 0)).toBe(0);
    });
    it('mixed values', () => {
      const c = computeCompatibilityFromComponents(80, 60, 50, 40);
      expect(c).toBeCloseTo(0.35 * 80 + 0.35 * 60 + 0.25 * 50 + 0.05 * 40, 10);
      expect(c).toBeCloseTo(63.5, 10);
    });
  });

  describe('frictionPenalty', () => {
    it('capped linear: Math.min(25, friction * 3)', () => {
      expect(frictionPenalty(0)).toBe(0);
      expect(frictionPenalty(1)).toBe(3);
      expect(frictionPenalty(2)).toBe(6);
      expect(frictionPenalty(10)).toBe(25);
    });
  });

  describe('computeFinalScore', () => {
    it('raw = compatibility * coverageFactor - frictionPenaltyScaled; finalScore clamped 0..100', () => {
      const compat = 80;
      const covFactor = 1;
      const friction = 0;
      const { raw, finalScore } = computeFinalScore(compat, covFactor, friction);
      expect(raw).toBe(80);
      expect(finalScore).toBe(80);
    });
    it('applies coverage factor', () => {
      const { raw, finalScore } = computeFinalScore(100, 0.5, 0);
      expect(raw).toBe(50);
      expect(finalScore).toBe(50);
    });
    it('subtracts scaled friction penalty (capped at 25 before scaling)', () => {
      const { raw, finalScore } = computeFinalScore(100, 1, 5);
      expect(raw).toBeCloseTo(100 - 15 * 0.7, 10); // penalty = min(25, 15) = 15
      expect(finalScore).toBe(90);
    });
    it('clamps to 0 when raw negative', () => {
      const { finalScore } = computeFinalScore(10, 0.1, 10);
      expect(finalScore).toBe(0);
    });
    it('clamps to 100 when raw above 100', () => {
      const { finalScore } = computeFinalScore(100, 1, 0);
      expect(finalScore).toBe(100);
    });
    it('rounds raw before clamping', () => {
      const { finalScore } = computeFinalScore(80, 0.5, 0);
      expect(finalScore).toBe(40);
    });
  });

  describe('formula consistency with engine source-of-truth', () => {
    it('delegates compatibility/coverage/friction/final math to engine formulas', () => {
      const aToB = 78;
      const bToA = 64;
      const relationshipFit = 52;
      const valuesAlignment = 37;
      const coveragePercent = 43;
      const friction = 6;

      const compatA = computeCompatibilityFromComponents(
        aToB,
        bToA,
        relationshipFit,
        valuesAlignment,
      );
      const compatB = engineCompatibility(aToB, bToA, relationshipFit, valuesAlignment);
      expect(compatA).toBeCloseTo(compatB, 10);

      const covA = coverageFactorFromPercent(coveragePercent);
      const covB = engineCoverageFactor(coveragePercent);
      expect(covA).toBeCloseTo(covB, 10);

      const penaltyA = frictionPenalty(friction);
      const penaltyB = engineFrictionPenalty(friction);
      expect(penaltyA).toBe(penaltyB);

      const resultA = computeFinalScore(compatA, covA, friction);
      const rawB = engineRawScore(compatB, covB, penaltyB);
      const finalB = engineFinalScore(rawB);
      expect(resultA.raw).toBeCloseTo(rawB, 10);
      expect(resultA.finalScore).toBe(finalB);
    });
  });
});
