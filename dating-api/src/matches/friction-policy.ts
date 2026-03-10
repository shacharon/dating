/**
 * Friction policy for the match engine: top-band relief and friction penalty state.
 * Uses engine/friction and engine/scoring formulas only; no formula changes.
 */

import { frictionPenalty as frictionPenaltyFormula } from '../engine/friction';
import { rawScore, FRICTION_SCALE } from '../engine/scoring';

export interface FrictionAndPenaltiesState {
  frictionPenaltyValue: number;
  frictionPenaltyScaled: number;
  frictionMultiplier: number;
  adjustedFrictionPenaltyValue: number;
  appliedFrictionPenaltyScaled: number;
  raw: number;
}

/**
 * Friction relief for already-strong matches only (deterministic, linear ramp):
 * - compatibility <= 70: no relief (multiplier 1.0)
 * - compatibility >= 90: max relief (multiplier 0.95)
 * - between 70..90: interpolate linearly
 */
export function topBandFrictionMultiplier(compatibilityScore: number): number {
  if (compatibilityScore <= 70) return 1;
  if (compatibilityScore >= 90) return 0.95;
  const t = (compatibilityScore - 70) / 20;
  return 1 - 0.05 * t;
}

/**
 * Slight relief for high friction (especially friction=4) so strong matches are not dragged down too hard.
 * When friction >= 4, scale the penalty by this factor (1 = no change).
 * Experiment: soften high-friction penalty after extraction fix
 */
const HIGH_FRICTION_RELIEF = 0.85;

export function computeFrictionAndFrictionPenalties(
  compatibilityValue: number,
  scoreCoverageFactorValue: number,
  friction: number,
): FrictionAndPenaltiesState {
  const frictionPenaltyValue = frictionPenaltyFormula(friction);
  const frictionMultiplier = topBandFrictionMultiplier(compatibilityValue);
  const highFrictionRelief = friction >= 4 ? HIGH_FRICTION_RELIEF : 1;
  const adjustedFrictionPenaltyValue =
    frictionPenaltyValue * frictionMultiplier * highFrictionRelief;
  const frictionPenaltyScaled = frictionPenaltyValue * FRICTION_SCALE;
  const appliedFrictionPenaltyScaled =
    adjustedFrictionPenaltyValue * FRICTION_SCALE;
  const raw = rawScore(
    compatibilityValue,
    scoreCoverageFactorValue,
    adjustedFrictionPenaltyValue,
  );
  return {
    frictionPenaltyValue,
    frictionPenaltyScaled,
    frictionMultiplier,
    adjustedFrictionPenaltyValue,
    appliedFrictionPenaltyScaled,
    raw,
  };
}
