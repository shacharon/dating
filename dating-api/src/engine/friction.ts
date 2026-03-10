/**
 * Friction penalty for the match engine.
 * Capped linear: Math.min(25, friction * 3) so max penalty is 25 (not 100).
 * Friction itself is unchanged (0..10 from rules).
 */

/**
 * frictionPenalty = Math.min(25, friction * 3)
 */
export function frictionPenalty(friction: number): number {
  return Math.min(25, friction * 3);
}
