/**
 * Coverage policy for the match engine: confidence and info flags from coverage percent.
 * Uses engine/coverage formulas only; no formula changes.
 */

import {
  coverageFactor as coverageFactorFormula,
  scoreCoverageFactor as scoreCoverageFactorFormula,
} from '../engine/coverage';

export type MatchInfoFlag = 'LOW_COVERAGE' | 'LOW_CONFIDENCE';

export interface CoverageConfidenceState {
  scoreCoverageFactorValue: number;
  coverageFactorValue: number;
  confidenceValue: number;
  infoFlags: MatchInfoFlag[];
}

/**
 * Compute scoreCoverageFactor, coverageFactor, confidence, and info flags from coverage percent.
 * LOW_COVERAGE when coveragePercent < 50; LOW_CONFIDENCE when confidence < 0.8.
 */
export function computeConfidenceAndInfoFlags(
  coveragePercentValue: number,
): CoverageConfidenceState {
  const scoreCoverageFactorValue = scoreCoverageFactorFormula(coveragePercentValue);
  const coverageFactorValue = coverageFactorFormula(coveragePercentValue);
  const confidenceValue = coverageFactorValue;
  const infoFlags: MatchInfoFlag[] = [];
  if (coveragePercentValue < 50) infoFlags.push('LOW_COVERAGE');
  if (confidenceValue < 0.8) infoFlags.push('LOW_CONFIDENCE');
  return {
    scoreCoverageFactorValue,
    coverageFactorValue,
    confidenceValue,
    infoFlags,
  };
}
