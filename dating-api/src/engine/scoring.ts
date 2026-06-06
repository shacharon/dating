/**
 * Deterministic scoring model for the match engine.
 * Formulas implemented exactly as specified.
 */

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Blend weights for compatibility(); must sum to 1. */
export const COMPATIBILITY_BLEND_WEIGHTS = {
  aToB: 0.3,
  bToA: 0.3,
  relationshipFit: 0.25,
  valuesAlignment: 0.15,
} as const;

/**
 * compatibility =
 * 0.30 * A_to_B +
 * 0.30 * B_to_A +
 * 0.25 * relationshipFit +
 * 0.15 * valuesAlignment
 * (valuesAlignmentForCompat in match-engine is capped at 85 before blend input.)
 */
export function compatibility(
  aToB: number,
  bToA: number,
  relationshipFit: number,
  valuesAlignment: number,
): number {
  const w = COMPATIBILITY_BLEND_WEIGHTS;
  return (
    w.aToB * aToB +
    w.bToA * bToA +
    w.relationshipFit * relationshipFit +
    w.valuesAlignment * valuesAlignment
  );
}

/**
 * raw = compatibility * scoreCoverageFactor - frictionPenaltyScaled
 * frictionPenaltyScaled = frictionPenalty * FRICTION_SCALE (calibration knob for friction only).
 * finalScore = clamp(round(rawScore)) to guarantee 0–100.
 */
export const FRICTION_SCALE = 0.7;

export function rawScore(
  compatibilityValue: number,
  scoreCoverageFactor: number,
  frictionPenaltyValue: number,
): number {
  const frictionPenaltyScaled = frictionPenaltyValue * FRICTION_SCALE;
  return compatibilityValue * scoreCoverageFactor - frictionPenaltyScaled;
}

/**
 * Guarantee finalScore is always in 0–100: round raw then clamp.
 */
export function finalScore(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}
