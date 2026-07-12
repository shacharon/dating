/**
 * Aggregate dealbreaker outcome / classification telemetry for MeMatchesService.list.
 * Bounded: one log line per list request (not per candidate).
 */

import type { HolyGrailDirectionalEvaluationResult } from './eligibility.evaluator';
import type { DealbreakerSignal } from './dealbreaker-signals-text.extract';
import type { HolyGrailHardEligibilityStatus } from './eligibility.evaluator';

const STATUSES: readonly HolyGrailHardEligibilityStatus[] = [
  'PASS',
  'FAIL',
  'UNKNOWN',
  'SKIPPED',
  'SOFT_PASS',
];

export type DealbreakerTagOutcomeCounts = Record<
  string,
  Record<HolyGrailHardEligibilityStatus, number>
>;

export type DealbreakerClassificationVolume = {
  HARD_EXCLUDE: number;
  HARD_REQUIRE: number;
  SOFT: number;
};

export function emptyDealbreakerTagOutcomeCounts(): DealbreakerTagOutcomeCounts {
  return {};
}

export function accumulateDealbreakerOutcomeCounts(
  counts: DealbreakerTagOutcomeCounts,
  evaluation: HolyGrailDirectionalEvaluationResult,
): void {
  for (const [tag, dim] of Object.entries(evaluation.dealbreakerDimensions)) {
    if (!counts[tag]) {
      counts[tag] = { PASS: 0, FAIL: 0, UNKNOWN: 0, SKIPPED: 0, SOFT_PASS: 0 };
    }
    counts[tag]![dim.status] += 1;
  }
}

export function countDealbreakerClassificationVolume(
  signals: readonly DealbreakerSignal[],
): DealbreakerClassificationVolume {
  const vol: DealbreakerClassificationVolume = {
    HARD_EXCLUDE: 0,
    HARD_REQUIRE: 0,
    SOFT: 0,
  };
  for (const s of signals) {
    vol[s.classification] += 1;
  }
  return vol;
}

/** Percentile of sorted copy (nearest-rank). */
export function percentileNearestRank(
  sortedAsc: readonly number[],
  p: number,
): number | null {
  if (sortedAsc.length === 0) return null;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  );
  return sortedAsc[idx]!;
}

export function hardConfidencePercentiles(
  signals: readonly DealbreakerSignal[],
): { p50: number | null; p90: number | null } {
  const hard = signals
    .filter(
      (s) =>
        s.classification === 'HARD_EXCLUDE' ||
        s.classification === 'HARD_REQUIRE',
    )
    .map((s) => s.confidence)
    .sort((a, b) => a - b);
  return {
    p50: percentileNearestRank(hard, 50),
    p90: percentileNearestRank(hard, 90),
  };
}

export function formatDealbreakerOutcomeCountsForLog(
  counts: DealbreakerTagOutcomeCounts,
): string {
  const tags = Object.keys(counts).sort();
  if (tags.length === 0) return 'tags=none';
  const body = tags
    .map((tag) => {
      const c = counts[tag]!;
      const per = STATUSES.map((s) => `${s}=${c[s]}`).join(',');
      return `${tag}:${per}`;
    })
    .join(';');
  return `tags=${body}`;
}

export function formatDealbreakerClassificationVolumeForLog(
  vol: DealbreakerClassificationVolume,
): string {
  return `classifications=HARD_EXCLUDE=${vol.HARD_EXCLUDE},HARD_REQUIRE=${vol.HARD_REQUIRE},SOFT=${vol.SOFT}`;
}

export function formatDealbreakerConfidenceForLog(
  signals: readonly DealbreakerSignal[],
): string {
  const { p50, p90 } = hardConfidencePercentiles(signals);
  return `confidenceHard=p50:${p50 ?? 'na'},p90:${p90 ?? 'na'}`;
}

export function formatKillSwitchTagsForLog(
  disabled: ReadonlySet<string>,
): string {
  if (disabled.size === 0) return 'killSwitchTags=none';
  return `killSwitchTags=${[...disabled].sort().join(',')}`;
}
