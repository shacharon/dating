import {
  clamp,
  coverageFactorFromPercent,
  computeCompatibilityFromComponents,
  frictionPenalty,
  computeFinalScore,
} from './scoring';

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
    it('sigmoid center near 40%', () => {
      const at40 = coverageFactorFromPercent(40);
      expect(at40).toBeCloseTo(0.5, 4);
    });
    it('approaches 1 for high coverage', () => {
      expect(coverageFactorFromPercent(100)).toBeGreaterThan(0.9);
      expect(coverageFactorFromPercent(100)).toBeLessThanOrEqual(1);
    });
    it('approaches 0 for low coverage', () => {
      expect(coverageFactorFromPercent(0)).toBeLessThan(0.1);
      expect(coverageFactorFromPercent(0)).toBeGreaterThanOrEqual(0);
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
    it('weighted sum: 0.35*A + 0.35*B + 0.20*R + 0.10*V', () => {
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
      expect(c).toBeCloseTo(0.35 * 80 + 0.35 * 60 + 0.2 * 50 + 0.1 * 40, 10);
      expect(c).toBe(63);
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
    it('raw = compatibility * coverageFactor - frictionPenalty; finalScore clamped 0..100', () => {
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
    it('subtracts friction penalty (capped at 25)', () => {
      const { raw, finalScore } = computeFinalScore(100, 1, 5);
      expect(raw).toBe(100 - 15); // penalty = min(25, 15) = 15
      expect(finalScore).toBe(85);
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
});
