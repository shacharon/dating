import {
  applySparseFinalScoreCap,
  LOW_COVERAGE_PERCENT_THRESHOLD,
  shouldApplySparseFinalScoreCap,
  SPARSE_FINAL_SCORE_CAP,
  SPARSE_MIN_PRESENT_SIGNALS,
} from './coverage-policy';

describe('coverage-policy sparse final cap', () => {
  it('exports thresholds aligned with LOW_COVERAGE flag', () => {
    expect(LOW_COVERAGE_PERCENT_THRESHOLD).toBe(50);
    expect(SPARSE_MIN_PRESENT_SIGNALS).toBe(5);
    expect(SPARSE_FINAL_SCORE_CAP).toBe(55);
  });

  describe('shouldApplySparseFinalScoreCap', () => {
    it('applies when coverage below threshold', () => {
      expect(shouldApplySparseFinalScoreCap(49, 10)).toBe(true);
    });

    it('applies when minPresent at sparse threshold', () => {
      expect(shouldApplySparseFinalScoreCap(60, SPARSE_MIN_PRESENT_SIGNALS)).toBe(
        true,
      );
    });

    it('does not apply when coverage and minPresent are sufficient', () => {
      expect(shouldApplySparseFinalScoreCap(60, 6)).toBe(false);
    });

    it('applies at coverage 49 with minPresent 6', () => {
      expect(shouldApplySparseFinalScoreCap(49, 6)).toBe(true);
    });
  });

  describe('applySparseFinalScoreCap', () => {
    it('caps score at 55 when coverage triggers', () => {
      expect(applySparseFinalScoreCap(80, 49, 10)).toBe(55);
    });

    it('caps score at 55 when minPresent triggers', () => {
      expect(applySparseFinalScoreCap(80, 60, 5)).toBe(55);
    });

    it('leaves score unchanged when neither trigger applies', () => {
      expect(applySparseFinalScoreCap(80, 60, 6)).toBe(80);
    });
  });
});
