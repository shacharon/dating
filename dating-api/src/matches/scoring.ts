/**
 * Deterministic scoring formulas for the match engine.
 * Pure functions; no framework deps.
 *
 * @deprecated Divergent legacy helper — production uses `engine/scoring.compatibility()`.
 */

/** Clamp value to [lo, hi] (inclusive). */
export function clamp(x: number, lo: number, hi: number): number {
  if (lo > hi) return Math.min(lo, Math.max(hi, x));
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Sigmoid on coverage percent: coverageFactor = 1 / (1 + exp(-(coveragePercent - 40)/10))
 * Returns value in (0, 1).
 */
export function coverageFactorFromPercent(coveragePercent: number): number {
  const x = (coveragePercent - 40) / 10;
  return 1 / (1 + Math.exp(-x));
}

/**
 * Compatibility from components (all 0..100):
 * 0.35*A_to_B + 0.35*B_to_A + 0.20*relationshipFit + 0.10*valuesAlignment
 */
export function computeCompatibilityFromComponents(
  aToB: number,
  bToA: number,
  relationshipFit: number,
  valuesAlignment: number,
): number {
  return (
    0.35 * aToB + 0.35 * bToA + 0.2 * relationshipFit + 0.1 * valuesAlignment
  );
}

/**
 * Friction penalty: capped linear Math.min(25, friction * 3).
 */
export function frictionPenalty(friction: number): number {
  return Math.min(25, friction * 3);
}

/**
 * Final score: raw = compatibility * coverageFactor - frictionPenalty;
 * finalScore = clamp(round(raw), 0, 100).
 */
export function computeFinalScore(
  compatibility: number,
  coverageFactor: number,
  friction: number,
): { raw: number; finalScore: number } {
  const penalty = frictionPenalty(friction);
  const raw = compatibility * coverageFactor - penalty;
  const finalScore = clamp(Math.round(raw), 0, 100);
  return { raw, finalScore };
}
