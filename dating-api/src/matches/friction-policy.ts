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
 * Friction relief for mid/high-compatibility matches (deterministic, linear ramp):
 * - compatibility <= 70: no relief (multiplier 1.0)
 * - compatibility >= 85: max relief (multiplier 0.85)
 * - between 70..85: interpolate linearly
 * Adjusted to provide more relief at mid-range (72-81) to help under-scored pairs.
 */
export function topBandFrictionMultiplier(compatibilityScore: number): number {
  if (compatibilityScore <= 70) return 1;
  if (compatibilityScore >= 85) return 0.85;
  const t = (compatibilityScore - 70) / 15;
  return 1 - 0.15 * t;
}

/**
 * Relief for medium/high friction so mid-range matches are not over-penalized.
 * When friction >= 3, scale the penalty by this factor (1 = no change).
 * Adjusted to help pairs with friction 3-4 at mid-range compatibility (72-81).
 */
const HIGH_FRICTION_RELIEF = 0.70;

export function computeFrictionAndFrictionPenalties(
  compatibilityValue: number,
  _scoreCoverageFactorValue: number,
  friction: number,
): FrictionAndPenaltiesState {
  const frictionPenaltyValue = frictionPenaltyFormula(friction);
  const frictionMultiplier = topBandFrictionMultiplier(compatibilityValue);
  const highFrictionRelief = friction >= 3 ? HIGH_FRICTION_RELIEF : 1;
  const adjustedFrictionPenaltyValue =
    frictionPenaltyValue * frictionMultiplier * highFrictionRelief;
  const frictionPenaltyScaled = frictionPenaltyValue * FRICTION_SCALE;
  const appliedFrictionPenaltyScaled =
    adjustedFrictionPenaltyValue * FRICTION_SCALE;
  /** Score path: no coverage multiplier — confidence uses coverage only. */
  const raw = rawScore(compatibilityValue, 1, adjustedFrictionPenaltyValue);
  return {
    frictionPenaltyValue,
    frictionPenaltyScaled,
    frictionMultiplier,
    adjustedFrictionPenaltyValue,
    appliedFrictionPenaltyScaled,
    raw,
  };
}
