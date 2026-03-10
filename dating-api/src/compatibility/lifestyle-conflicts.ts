/**
 * Detect structural lifestyle conflicts between two profiles' signals.
 * Deterministic rules; no LLM. Framework-agnostic.
 */

import type { SignalKey, SignalValue } from './compatibility-score';
import { TIER1_KEYS } from './compatibility-score';

export const LIFESTYLE_CONFLICT_KEYS = [
  'schedule_conflict',
  'status_gap',
  'social_exposure_gap',
  'pace_mismatch',
  'values_mismatch',
] as const;

export type LifestyleConflictKey = (typeof LIFESTYLE_CONFLICT_KEYS)[number];

export interface LifestyleConflictsResult {
  conflicts: LifestyleConflictKey[];
  severity: number; // 0-10
}

type SignalsLike = Record<string, SignalValue>;

function getNum(s: SignalsLike, key: string): number | null {
  const v = s[key];
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

function gap(a: number | null, b: number | null): number | null {
  if (a == null || b == null) return null;
  return Math.abs(a - b);
}

/**
 * Detect structural lifestyle conflicts between profileA and profileB signals.
 * - pace_mismatch: lifestylePace diff > 3
 * - status_gap: statusOrientation diff > 4
 * - social_exposure_gap: socialBattery diff > 4
 * - schedule_conflict: independence diff > 4 (lifestyle independence vs togetherness/family time)
 * - values_mismatch: 2+ Tier1 signals with diff > 3, or mean Tier1 gap > 3.5
 * Severity 0-10 based on number of conflicts and magnitude of gaps.
 */
export function detectLifestyleConflicts(
  signalsA: SignalsLike,
  signalsB: SignalsLike,
): LifestyleConflictsResult {
  const conflicts: LifestyleConflictKey[] = [];
  let severitySum = 0;

  // pace_mismatch: lifestylePace diff > 3
  const paceGap = gap(getNum(signalsA, 'lifestylePace'), getNum(signalsB, 'lifestylePace'));
  if (paceGap != null && paceGap > 3) {
    conflicts.push('pace_mismatch');
    severitySum += 2 + (paceGap - 3) * 0.5;
  }

  // status_gap: statusOrientation diff > 4
  const statusGap = gap(getNum(signalsA, 'statusOrientation'), getNum(signalsB, 'statusOrientation'));
  if (statusGap != null && statusGap > 4) {
    conflicts.push('status_gap');
    severitySum += 2 + (statusGap - 4) * 0.5;
  }

  // social_exposure_gap: socialBattery diff > 4
  const socialGap = gap(getNum(signalsA, 'socialBattery'), getNum(signalsB, 'socialBattery'));
  if (socialGap != null && socialGap > 4) {
    conflicts.push('social_exposure_gap');
    severitySum += 2 + (socialGap - 4) * 0.5;
  }

  // schedule_conflict: independence diff > 4 (independence vs family/togetherness)
  const independenceGap = gap(getNum(signalsA, 'independence'), getNum(signalsB, 'independence'));
  if (independenceGap != null && independenceGap > 4) {
    conflicts.push('schedule_conflict');
    severitySum += 2 + (independenceGap - 4) * 0.5;
  }

  // values_mismatch: 2+ Tier1 gaps > 3, or mean Tier1 gap > 3.5
  let tier1GapCount = 0;
  let tier1GapSum = 0;
  let tier1Compared = 0;
  for (const key of TIER1_KEYS as readonly SignalKey[]) {
    const g = gap(getNum(signalsA, key), getNum(signalsB, key));
    if (g != null) {
      tier1GapSum += g;
      tier1Compared++;
      if (g > 3) tier1GapCount++;
    }
  }
  const meanTier1Gap = tier1Compared > 0 ? tier1GapSum / tier1Compared : 0;
  const valuesMismatch = tier1GapCount >= 2 || meanTier1Gap > 3.5;
  if (valuesMismatch) {
    conflicts.push('values_mismatch');
    severitySum += 2 + Math.min(2, Math.max(0, (meanTier1Gap - 3) * 0.5));
  }

  const severity = Math.min(10, Math.max(0, Math.round(severitySum)));

  return {
    conflicts: [...conflicts],
    severity,
  };
}
