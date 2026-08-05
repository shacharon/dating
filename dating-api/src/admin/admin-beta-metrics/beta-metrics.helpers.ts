import {
  PRIORITY_GOOD_MIN,
  PRIORITY_HIGH_MIN,
} from '../../me-profile/match-priority';

export type D7RetentionSnapshot = {
  cohortSize: number;
  returnedCount: number;
  /** Fraction 0–1, or null when cohort empty. */
  rate: number | null;
  /** True when cohortSize < 20 — do not use % for kill bands. */
  advisory: boolean;
};

export type PriorityShareSnapshot = {
  highCount: number;
  goodCount: number;
  otherCount: number;
  scoredCount: number;
  highShare: number | null;
  goodShare: number | null;
  otherShare: number | null;
};

export function rateOrNull(
  numerator: number,
  denominator: number,
): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export function calculateD7Retention(
  cohortSize: number,
  returnedCount: number,
): D7RetentionSnapshot {
  const safeCohort = Math.max(0, cohortSize);
  const safeReturned = Math.min(Math.max(0, returnedCount), safeCohort);
  return {
    cohortSize: safeCohort,
    returnedCount: safeReturned,
    rate: rateOrNull(safeReturned, safeCohort),
    advisory: safeCohort < 20,
  };
}

/**
 * Priority share among non-hard-blocked scored ranks (score ≥ 0).
 * HIGH ≥ 85, GOOD ≥ 70, else OTHER.
 */
export function calculatePriorityShare(args: {
  highCount: number;
  goodCount: number;
  otherCount: number;
}): PriorityShareSnapshot {
  const highCount = Math.max(0, args.highCount);
  const goodCount = Math.max(0, args.goodCount);
  const otherCount = Math.max(0, args.otherCount);
  const scoredCount = highCount + goodCount + otherCount;
  return {
    highCount,
    goodCount,
    otherCount,
    scoredCount,
    highShare: rateOrNull(highCount, scoredCount),
    goodShare: rateOrNull(goodCount, scoredCount),
    otherShare: rateOrNull(otherCount, scoredCount),
  };
}

export function priorityBucketForScore(score: number): 'HIGH' | 'GOOD' | 'OTHER' {
  if (score >= PRIORITY_HIGH_MIN) return 'HIGH';
  if (score >= PRIORITY_GOOD_MIN) return 'GOOD';
  return 'OTHER';
}

/** Default beta window start: 30 days before `asOf`. */
export function defaultBetaStart(asOf: Date): Date {
  return new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000);
}

/**
 * Parse `YYYY-MM-DD` or ISO datetime; invalid / missing → defaultBetaStart(asOf).
 */
export function parseBetaStartParam(
  raw: string | undefined,
  asOf: Date,
): Date {
  if (!raw?.trim()) return defaultBetaStart(asOf);
  const parsed = new Date(raw.trim());
  if (Number.isNaN(parsed.getTime())) return defaultBetaStart(asOf);
  return parsed;
}
