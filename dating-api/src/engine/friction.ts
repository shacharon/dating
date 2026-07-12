/**
 * Friction penalty for the match engine.
 * Capped linear: Math.min(25, friction * 3) so max penalty is 25 (not 100).
 * Friction itself is unchanged (0..10 from rules).
 */

/**
 * frictionPenalty = Math.min(25, friction * 3)
 */
export function frictionPenalty(friction: number): number {
  const basePenalty = Math.min(25, friction * 3);
  // DATING_SCORING_FRICTION_SINGLE_EXPERIMENT
  // Single reversible experiment: modestly soften high-friction penalties (especially friction=4).
  if (friction >= 4) return basePenalty * 0.9;
  return basePenalty;
}
