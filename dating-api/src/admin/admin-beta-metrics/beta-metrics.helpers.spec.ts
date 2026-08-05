import {
  calculateD7Retention,
  calculatePriorityShare,
  parseBetaStartParam,
  priorityBucketForScore,
} from './beta-metrics.helpers';

describe('beta-metrics.helpers', () => {
  describe('calculateD7Retention', () => {
    it('computes rate and advisory for small cohorts', () => {
      const snap = calculateD7Retention(10, 4);
      expect(snap.rate).toBeCloseTo(0.4);
      expect(snap.advisory).toBe(true);
      expect(snap.cohortSize).toBe(10);
      expect(snap.returnedCount).toBe(4);
    });

    it('clears advisory when cohort ≥ 20', () => {
      const snap = calculateD7Retention(20, 8);
      expect(snap.rate).toBeCloseTo(0.4);
      expect(snap.advisory).toBe(false);
    });

    it('returns null rate for empty cohort', () => {
      expect(calculateD7Retention(0, 0).rate).toBeNull();
    });
  });

  describe('calculatePriorityShare', () => {
    it('splits HIGH/GOOD/OTHER shares', () => {
      const snap = calculatePriorityShare({
        highCount: 2,
        goodCount: 3,
        otherCount: 5,
      });
      expect(snap.scoredCount).toBe(10);
      expect(snap.highShare).toBeCloseTo(0.2);
      expect(snap.goodShare).toBeCloseTo(0.3);
      expect(snap.otherShare).toBeCloseTo(0.5);
    });

    it('returns null shares when unscored', () => {
      const snap = calculatePriorityShare({
        highCount: 0,
        goodCount: 0,
        otherCount: 0,
      });
      expect(snap.highShare).toBeNull();
    });
  });

  describe('priorityBucketForScore', () => {
    it('uses 85 / 70 thresholds', () => {
      expect(priorityBucketForScore(85)).toBe('HIGH');
      expect(priorityBucketForScore(84.9)).toBe('GOOD');
      expect(priorityBucketForScore(70)).toBe('GOOD');
      expect(priorityBucketForScore(69.9)).toBe('OTHER');
    });
  });

  describe('parseBetaStartParam', () => {
    const asOf = new Date('2026-08-05T12:00:00.000Z');

    it('defaults to 30 days before asOf', () => {
      const start = parseBetaStartParam(undefined, asOf);
      expect(start.toISOString()).toBe('2026-07-06T12:00:00.000Z');
    });

    it('parses YYYY-MM-DD', () => {
      const start = parseBetaStartParam('2026-08-01', asOf);
      expect(start.toISOString().startsWith('2026-08-01')).toBe(true);
    });
  });
});
