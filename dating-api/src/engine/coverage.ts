/**
 * Coverage utilities for the match engine.
 * coverageFactor = 0.7 + 0.3 * coveragePercent (confidence weighting 70–100%)
 * scoreCoverageFactor = 0.85 + 0.15 * coveragePercent (light score weighting 85–100%)
 * coveragePercent = round(100 * (numComparableSignals / totalSignals))
 */

/**
 * Coverage as confidence weighting: 0.7 + 0.3 * coveragePercent (with coveragePercent in 0..1).
 * Input coveragePercent is in 0..100 scale; normalized to 0..1 before applying.
 */
export function coverageFactor(coveragePercent: number): number {
  const coveragePercentNormalized = Math.max(0, Math.min(1, coveragePercent / 100));
  const coverageFactorValue = 0.7 + 0.3 * coveragePercentNormalized;
  return coverageFactorValue;
}

/**
 * Light score weighting from coverage: 0.88 + 0.12 * coveragePercent (with coveragePercent in 0..1).
 * Softer low-coverage penalty (floor 0.88 vs 0.85) for calibration; ceiling remains 1.0.
 */
export function scoreCoverageFactor(coveragePercent: number): number {
  const c = Math.max(0, Math.min(100, coveragePercent));
  if (c <= 50) return 0.9 + (0.06 * c) / 50;
  return 0.96 + (0.04 * (c - 50)) / 50;
}

/**
 * coveragePercent = round(100 * (numComparableSignals / totalSignals))
 * comparable = signals where BOTH profiles have numeric values
 */
export function coveragePercent(numComparableSignals: number, totalSignals: number): number {
  if (totalSignals <= 0) return 0;
  return Math.round(100 * (numComparableSignals / totalSignals));
}
