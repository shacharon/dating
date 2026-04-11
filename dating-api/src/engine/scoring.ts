/**
 * Deterministic scoring model for the match engine.
 * Formulas implemented exactly as specified.
 */

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * compatibility =
 * 0.35 * A_to_B +
 * 0.35 * B_to_A +
 * 0.25 * relationshipFit +
 * 0.05 * valuesAlignment
 * (valuesAlignment reduced to limit double-counting of shared vibe signals.)
 */
export function compatibility(
  aToB: number,
  bToA: number,
  relationshipFit: number,
  valuesAlignment: number,
): number {
  return (
    0.35 * aToB + 0.35 * bToA + 0.25 * relationshipFit + 0.05 * valuesAlignment
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
