/**
 * Deterministic compatibility scoring for dating extraction output.
 * Framework-agnostic; no Nest/Angular deps.
 */

export type SignalValue = number | null;
export type SignalKey =
  | 'ambition'
  | 'socialBattery'
  | 'healthBodyConsciousness'
  | 'emotionalDepth'
  | 'attachmentSecurity'
  | 'directness'
  | 'independence'
  | 'traditionalism'
  | 'financialMindset'
  | 'relationshipClarity'
  | 'spirituality'
  | 'lifestylePace'
  | 'physicalPriority'
  | 'statusOrientation';

export type SignalsMap = Record<SignalKey, SignalValue>;

export const COMPATIBILITY_SIGNAL_KEYS: readonly SignalKey[] = [
  'ambition',
  'socialBattery',
  'healthBodyConsciousness',
  'emotionalDepth',
  'attachmentSecurity',
  'directness',
  'independence',
  'traditionalism',
  'financialMindset',
  'relationshipClarity',
  'spirituality',
  'lifestylePace',
  'physicalPriority',
  'statusOrientation',
] as const;

/** Product policy: per-key weights (high = more impact on score). */
export const COMPATIBILITY_WEIGHTS: Record<SignalKey, number> = {
  ambition: 1,
  socialBattery: 1,
  healthBodyConsciousness: 1,
  emotionalDepth: 1.5,
  attachmentSecurity: 1.2,
  directness: 1,
  independence: 1,
  traditionalism: 1,
  financialMindset: 1.5,
  relationshipClarity: 1.2,
  spirituality: 1.5,
  lifestylePace: 1.5,
  physicalPriority: 1.2,
  statusOrientation: 1.2,
};

/** Fixed penalty (0–100 scale) per hard mismatch. */
export const HARD_MISMATCH_PENALTY_PER_ITEM = 5;

/** Max percentage (0–100) by which coverage can reduce score. */
export const MAX_COVERAGE_PENALTY_PERCENT = 20;

/** Below this coverage (0–1), coverage penalty applies; used only for internal logic. */
export const MIN_COVERAGE_FOR_CONFIDENT_SCORE = 0.5;

const HARD_MISMATCH_KEYS: readonly SignalKey[] = [
  'emotionalDepth',
  'financialMindset',
  'spirituality',
  'lifestylePace',
  'physicalPriority',
  'statusOrientation',
];

const HARD_MISMATCH_THRESHOLD = 7;

export interface HardMismatch {
  key: SignalKey;
  self: number;
  partner: number;
  gap: number;
  reason: string;
}

export interface BreakdownEntry {
  key: SignalKey;
  self: number;
  partner: number;
  gap: number;
  pairScore: number;
}

export interface CompatibilityResult {
  overallScore: number;
  coverage: number;
  matchedSignals: number;
  hardMismatches: HardMismatch[];
  breakdown: BreakdownEntry[];
  /** Optional debug metadata (non-breaking). */
  debug?: {
    comparedKeys: number;
    totalKeys: number;
    weightedScoreBeforePenalties: number;
    coveragePenaltyApplied: number;
    hardMismatchPenaltyApplied: number;
  };
}

function pairScoreFromGap(gap: number): number {
  return Math.max(0, 10 - gap);
}

/**
 * Compute compatibility between self and partner signal maps.
 * Ignores keys where either side is null. Per-key score = max(0, 10 - gap).
 * Applies light coverage penalty and hard mismatch penalties.
 */
export function computeCompatibility(
  selfSignals: SignalsMap | Record<string, SignalValue>,
  partnerSignals: SignalsMap | Record<string, SignalValue>,
): CompatibilityResult {
  const keys = COMPATIBILITY_SIGNAL_KEYS;
  const totalKeys = keys.length;
  const breakdown: BreakdownEntry[] = [];
  const hardMismatches: HardMismatch[] = [];
  let weightedSum = 0;
  let totalWeight = 0;
  let comparedCount = 0;

  for (const key of keys) {
    const selfVal = selfSignals[key];
    const partnerVal = partnerSignals[key];
    if (selfVal == null || partnerVal == null) continue;

    const selfNum = Number(selfVal);
    const partnerNum = Number(partnerVal);
    if (!Number.isFinite(selfNum) || !Number.isFinite(partnerNum)) continue;

    const gap = Math.abs(selfNum - partnerNum);
    const pairScore = pairScoreFromGap(gap);
    const weight = COMPATIBILITY_WEIGHTS[key];
    breakdown.push({ key, self: selfNum, partner: partnerNum, gap, pairScore });
    weightedSum += weight * pairScore;
    totalWeight += weight;
    comparedCount += 1;

    const isHardKey = HARD_MISMATCH_KEYS.includes(key);
    if (isHardKey && gap >= HARD_MISMATCH_THRESHOLD) {
      hardMismatches.push({
        key,
        self: selfNum,
        partner: partnerNum,
        gap,
        reason: `Hard mismatch: ${key} gap ${gap} >= ${HARD_MISMATCH_THRESHOLD}`,
      });
    }
  }

  const coverage = totalKeys > 0 ? comparedCount / totalKeys : 0;
  const avgScore =
    totalWeight > 0 ? weightedSum / totalWeight : 0;
  const coveragePenaltyCap = MAX_COVERAGE_PENALTY_PERCENT / 100;
  const coveragePenaltyRaw = 1 - coverage;
  const coveragePenaltyApplied = Math.min(
    coveragePenaltyCap,
    Math.max(0, coveragePenaltyRaw),
  );
  const scoreAfterCoverage = avgScore * (1 - coveragePenaltyApplied);
  const weightedScoreBeforePenalties100 = (avgScore / 10) * 100;
  let overallScore = Math.round(
    Math.max(0, Math.min(100, (scoreAfterCoverage / 10) * 100)),
  );

  const hardMismatchPenaltyApplied =
    hardMismatches.length * HARD_MISMATCH_PENALTY_PER_ITEM;
  overallScore = Math.max(
    0,
    Math.min(100, overallScore - hardMismatchPenaltyApplied),
  );

  const debug = {
    comparedKeys: comparedCount,
    totalKeys,
    weightedScoreBeforePenalties: Math.round(
      Math.max(0, Math.min(100, weightedScoreBeforePenalties100)),
    ),
    coveragePenaltyApplied,
    hardMismatchPenaltyApplied,
  };

  return {
    overallScore,
    coverage,
    matchedSignals: comparedCount,
    hardMismatches,
    breakdown,
    debug,
  };
}

/*
 * Example usage:
 *
 * const self: SignalsMap = {
 *   ambition: 8, socialBattery: 6, healthBodyConsciousness: 7,
 *   emotionalDepth: 7, attachmentSecurity: 5, directness: 8,
 *   independence: 6, traditionalism: 4, financialMindset: 5,
 *   relationshipClarity: 7, spirituality: 3, lifestylePace: 6,
 *   physicalPriority: 5, statusOrientation: 4,
 * };
 * const partner: SignalsMap = { ...self };
 * const result = computeCompatibility(self, partner);
 * console.log(result.overallScore, result.coverage, result.hardMismatches);
 */
