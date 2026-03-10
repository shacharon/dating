/**
 * Calibration policy for the match engine: score stretch, top-end boost, dealbreaker cap, sparse calibration.
 * Uses domain/dealbreakers and env; no formula changes.
 */

import { applyDealbreakerCap, type Dealbreaker } from '../domain/dealbreakers';

function clampTo100(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)));
}

/** SCORE_STRETCH env: applied at end as finalScore = clamp(round(raw * SCORE_STRETCH), 0, 100). Default 1 (no stretch). */
let _scoreStretchLogged = false;
export function getScoreStretch(): number {
  const raw = process.env.SCORE_STRETCH;
  const n = raw != null && raw !== '' ? parseFloat(raw) : NaN;
  if (!_scoreStretchLogged) {
    _scoreStretchLogged = true;
    console.debug('[getScoreStretch] raw env:', JSON.stringify(raw), '| parsed:', n);
  }
  if (raw == null || raw === '') return 1;
  if (!Number.isFinite(n)) return 1;
  return Math.max(0.1, Math.min(2, n));
}

/**
 * Top-end calibration (piecewise, deterministic):
 * - scores <= start: unchanged
 * - scores > start: only the excess above start is stretched by slope
 */
export function getTopEndBoostStart(): number {
  const raw = process.env.TOP_END_BOOST_START;
  if (raw == null || raw === '') return 70;
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return 70;
  return Math.max(40, Math.min(95, n));
}

let _topEndBoostSlopeLogged = false;
export function getTopEndBoostSlope(): number {
  const raw = process.env.TOP_END_BOOST_SLOPE;
  const n = raw != null && raw !== '' ? parseFloat(raw) : NaN;
  if (!_topEndBoostSlopeLogged) {
    _topEndBoostSlopeLogged = true;
    console.debug('[getTopEndBoostSlope] raw env:', JSON.stringify(raw), '| parsed:', n);
  }
  if (raw == null || raw === '') return 1;
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(3, n));
}

export function applyTopEndCalibration(score: number): number {
  const start = getTopEndBoostStart();
  const slope = getTopEndBoostSlope();
  if (score <= start) return score;
  return start + (score - start) * slope;
}

export interface CapsCalibrationState {
  finalScoreValue: number;
  finalScoreBeforeSparseCalibration: number | undefined;
  finalScoreClamped: number;
  preCapFinalScore: number;
}

export function applyCapsAndCalibration(
  raw: number,
  dealbreakers: Dealbreaker[],
  coveragePercentValue: number,
): CapsCalibrationState {
  const scoreStretch = getScoreStretch();
  const stretchedScore = raw * scoreStretch;
  const topEndCalibratedScore = applyTopEndCalibration(stretchedScore);
  const preCapFinalScore = clampTo100(topEndCalibratedScore);
  const finalScoreValue = applyDealbreakerCap(preCapFinalScore, dealbreakers);

  let finalScoreBeforeSparseCalibration: number | undefined;
  let scoreAfterSparse = finalScoreValue;
  if (coveragePercentValue <= 55) {
    const sparseMultiplier =
      coveragePercentValue <= 50
        ? 0.94 + (coveragePercentValue / 50) * 0.06
        : 0.96 + ((coveragePercentValue - 50) / 5) * 0.04;
    finalScoreBeforeSparseCalibration = finalScoreValue;
    scoreAfterSparse = finalScoreValue * Math.min(1, sparseMultiplier);
  }
  const finalScoreClamped = Math.max(0, Math.min(100, Math.round(scoreAfterSparse)));

  return {
    finalScoreValue,
    finalScoreBeforeSparseCalibration,
    finalScoreClamped,
    preCapFinalScore,
  };
}
