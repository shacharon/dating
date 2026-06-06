/**
 * Coverage policy for the match engine: confidence, info flags, and sparse final score cap.
 * Uses engine/coverage formulas only; no formula changes.
 */

import {
  coverageFactor as coverageFactorFormula,
  scoreCoverageFactor as scoreCoverageFactorFormula,
} from '../engine/coverage';

export type MatchInfoFlag = 'LOW_COVERAGE' | 'LOW_CONFIDENCE';

/** Pair coverage % below which we flag LOW_COVERAGE and may apply sparse final cap. */
export const LOW_COVERAGE_PERCENT_THRESHOLD = 50;

/** Min numeric self-signals on the sparser profile (of 14 keys) for sparse final cap. */
export const SPARSE_MIN_PRESENT_SIGNALS = 5;

/** Max finalScore when sparse cap applies (after dealbreakers and hard 90 cap). */
export const SPARSE_FINAL_SCORE_CAP = 55;

export interface CoverageConfidenceState {
  scoreCoverageFactorValue: number;
  coverageFactorValue: number;
  confidenceValue: number;
  infoFlags: MatchInfoFlag[];
}

export function shouldApplySparseFinalScoreCap(
  coveragePercent: number,
  minPresent: number,
): boolean {
  return (
    coveragePercent < LOW_COVERAGE_PERCENT_THRESHOLD ||
    minPresent <= SPARSE_MIN_PRESENT_SIGNALS
  );
}

export function applySparseFinalScoreCap(
  finalScoreClamped: number,
  coveragePercent: number,
  minPresent: number,
): number {
  if (!shouldApplySparseFinalScoreCap(coveragePercent, minPresent)) {
    return finalScoreClamped;
  }
  return Math.min(finalScoreClamped, SPARSE_FINAL_SCORE_CAP);
}

/**
 * Compute scoreCoverageFactor, coverageFactor, confidence, and info flags from coverage percent.
 * LOW_COVERAGE when coveragePercent < LOW_COVERAGE_PERCENT_THRESHOLD; LOW_CONFIDENCE when confidence < 0.8.
 */
export function computeConfidenceAndInfoFlags(
  coveragePercentValue: number,
): CoverageConfidenceState {
  const scoreCoverageFactorValue =
    scoreCoverageFactorFormula(coveragePercentValue);
  const coverageFactorValue = coverageFactorFormula(coveragePercentValue);
  const confidenceValue = coverageFactorValue;
  const infoFlags: MatchInfoFlag[] = [];
  if (coveragePercentValue < LOW_COVERAGE_PERCENT_THRESHOLD) {
    infoFlags.push('LOW_COVERAGE');
  }
  if (confidenceValue < 0.8) infoFlags.push('LOW_CONFIDENCE');
  return {
    scoreCoverageFactorValue,
    coverageFactorValue,
    confidenceValue,
    infoFlags,
  };
}
