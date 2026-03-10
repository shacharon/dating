/**
 * Legacy scoring shim for historical tests/helpers.
 * Source of truth is under ../engine/* and this file delegates to it.
 */

import { coverageFactor as engineCoverageFactor } from '../engine/coverage';
import { frictionPenalty as engineFrictionPenalty } from '../engine/friction';
import {
  compatibility as engineCompatibility,
  finalScore as engineFinalScore,
  rawScore as engineRawScore,
} from '../engine/scoring';

/** Clamp value to [lo, hi] (inclusive). */
export function clamp(x: number, lo: number, hi: number): number {
  if (lo > hi) return Math.min(lo, Math.max(hi, x));
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Legacy name, engine semantics: coverage factor is linear in 0..100 coverage percent.
 */
export function coverageFactorFromPercent(coveragePercent: number): number {
  return engineCoverageFactor(coveragePercent);
}

/**
 * Compatibility from components (all 0..100):
 * 0.35*A_to_B + 0.35*B_to_A + 0.25*relationshipFit + 0.05*valuesAlignment
 */
export function computeCompatibilityFromComponents(
  aToB: number,
  bToA: number,
  relationshipFit: number,
  valuesAlignment: number,
): number {
  return engineCompatibility(aToB, bToA, relationshipFit, valuesAlignment);
}

/**
 * Friction penalty: capped linear Math.min(25, friction * 3).
 */
export function frictionPenalty(friction: number): number {
  return engineFrictionPenalty(friction);
}

/**
 * Final score delegates to engine semantics:
 * raw = compatibility * coverageFactor - (frictionPenalty * FRICTION_SCALE)
 * finalScore = clamp(round(raw), 0, 100).
 */
export function computeFinalScore(
  compatibility: number,
  coverageFactor: number,
  friction: number,
): { raw: number; finalScore: number } {
  const penalty = frictionPenalty(friction);
  const raw = engineRawScore(compatibility, coverageFactor, penalty);
  const finalScore = engineFinalScore(raw);
  return { raw, finalScore };
}
