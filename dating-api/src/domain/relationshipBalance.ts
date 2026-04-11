/**
 * Relationship balance ratio: positive/negative score for match evaluation.
 * Uses only existing signal keys; no new extraction keys. No framework decorators.
 */

import type { CoreSignals, Dealbreaker } from './dealbreakers';

export interface RelationshipBalanceResult {
  positiveScore: number;
  negativeScore: number;
  ratio: number;
  reasons: string[];
}

export interface RelationshipBalanceInput {
  signalsA: CoreSignals;
  signalsB: CoreSignals;
  motivationA?:
    | 'family_builder'
    | 'emotional_connection'
    | 'status_power'
    | 'freedom_independence';
  motivationB?:
    | 'family_builder'
    | 'emotional_connection'
    | 'status_power'
    | 'freedom_independence';
  dealbreakers: Dealbreaker[];
}

function n(x: number | null | undefined, fallback = 5): number {
  return typeof x === 'number' ? x : fallback;
}

function diff(
  a: number | null | undefined,
  b: number | null | undefined,
  fallback = 5,
): number {
  return Math.abs(n(a, fallback) - n(b, fallback));
}

/**
 * Compute relationship balance: positive score (0..10), negative score (0.5..10), ratio, reasons.
 */
export function computeRelationshipBalance(
  input: RelationshipBalanceInput,
): RelationshipBalanceResult {
  const { signalsA, signalsB, motivationA, motivationB, dealbreakers } = input;
  let positiveScore = 0;
  const reasons: string[] = [];

  if (
    motivationA != null &&
    motivationB != null &&
    motivationA === motivationB
  ) {
    positiveScore += 2;
    reasons.push('motivation match');
  }

  if (n(signalsA.directness, 5) >= 6 && n(signalsB.directness, 5) >= 6) {
    positiveScore += 1;
    reasons.push('both directness>=6');
  }
  if (
    n(signalsA.attachmentSecurity, 5) >= 6 &&
    n(signalsB.attachmentSecurity, 5) >= 6
  ) {
    positiveScore += 1;
    reasons.push('both attachmentSecurity>=6');
  }
  if (diff(signalsA.lifestylePace, signalsB.lifestylePace, 5) <= 2) {
    positiveScore += 1;
    reasons.push('lifestylePace diff<=2');
  }
  if (diff(signalsA.socialBattery, signalsB.socialBattery, 5) <= 2) {
    positiveScore += 1;
    reasons.push('socialBattery diff<=2');
  }
  if (diff(signalsA.independence, signalsB.independence, 5) <= 2) {
    positiveScore += 1;
    reasons.push('independence diff<=2');
  }
  const fa = signalsA.financialMindset;
  const fb = signalsB.financialMindset;
  if (
    fa != null &&
    fb != null &&
    typeof fa === 'number' &&
    typeof fb === 'number' &&
    Math.abs(fa - fb) <= 2
  ) {
    positiveScore += 1;
    reasons.push('financialMindset diff<=2');
  }

  positiveScore = Math.max(0, Math.min(10, positiveScore));

  let maxDealbreakerSeverityScore = 0;
  for (const d of dealbreakers) {
    if (d.severity === 'HARD')
      maxDealbreakerSeverityScore = Math.max(maxDealbreakerSeverityScore, 6);
    else if (d.severity === 'STRONG_FLAG' || d.severity === 'PENALTY')
      maxDealbreakerSeverityScore = Math.max(maxDealbreakerSeverityScore, 3);
    else if (d.severity === 'WARNING')
      maxDealbreakerSeverityScore = Math.max(maxDealbreakerSeverityScore, 1);
  }
  let negativeScore = 0.5 + maxDealbreakerSeverityScore;
  if (
    n(signalsA.emotionalDepth, 5) <= 3 &&
    n(signalsB.emotionalDepth, 5) <= 3
  ) {
    negativeScore += 1;
  }
  negativeScore = Math.max(0.5, Math.min(10, negativeScore));

  const ratio =
    negativeScore > 0 ? positiveScore / negativeScore : positiveScore;

  const topReasons = reasons.slice(0, 3);

  return {
    positiveScore,
    negativeScore,
    ratio,
    reasons: topReasons,
  };
}
