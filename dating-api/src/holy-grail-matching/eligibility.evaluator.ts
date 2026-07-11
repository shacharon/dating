/**
 * Layer-3 Holy Grail hard eligibility (structured prefs vs counterparty facts).
 * Kept dimensions: GENDER, AGE, PROXIMITY only (Sprint 15 Story 1).
 * Sprint 16 Story 1: distinct UNKNOWN for missing/withheld facts + per-dimension blocking policy.
 */
import type {
  MatchingCanonicalModel,
  MatchingFacts,
  MatchingPreferences,
} from '../canonical/matching-canonical.types';
import { GenderIdentity } from '../canonical/matching-canonical.types';
import { ageWholeYearsUtcFromYmd } from './holy-grail-dob-ymd';
import {
  HOLY_GRAIL_DIMENSION_KEYS,
  type HolyGrailDimensionKey,
} from './holy-grail-dimensions';

/**
 * Per-dimension Layer 3 outcome (internal). `PASS` and `SOFT_PASS` always allow;
 * `SKIPPED` (no preference set) is always inert. `FAIL` (a genuine, known mismatch)
 * always blocks. `UNKNOWN` (the fact is missing/withheld, not mismatched) blocks or
 * not depending on the dimension's `HolyGrailDimensionBlockingPolicy` — see
 * {@link resolveDimensionOutcome}. Sprint 16 Story 1.
 */
export type HolyGrailHardEligibilityStatus =
  | 'PASS'
  | 'FAIL'
  | 'UNKNOWN'
  | 'SKIPPED'
  | 'SOFT_PASS';

/**
 * Whether a dimension's `UNKNOWN` outcome (fact missing/withheld) blocks
 * `overallHardEligibility`. `GENDER`/`AGE`/`PROXIMITY` are `BLOCKS_ON_UNKNOWN`
 * (unchanged net behavior from before this status existed). `NEVER_BLOCKS` exists
 * for future classifier-derived dimensions (Sprint 17).
 */
export type HolyGrailDimensionBlockingPolicy =
  | 'BLOCKS_ON_UNKNOWN'
  | 'NEVER_BLOCKS';

/** Explicit, not inferred — Sprint 17 extends this map with per-classifier-tag entries. */
export const HOLY_GRAIL_DIMENSION_BLOCKING_POLICY: Record<
  HolyGrailDimensionKey,
  HolyGrailDimensionBlockingPolicy
> = {
  GENDER: 'BLOCKS_ON_UNKNOWN',
  AGE: 'BLOCKS_ON_UNKNOWN',
  PROXIMITY: 'BLOCKS_ON_UNKNOWN',
};

/**
 * Resolves a dimension's raw status against its blocking policy into the effective
 * status used to compute `overallHardEligibility`. Pure, total (all 5 raw statuses ×
 * both policy values are defined) — the per-dimension `status` shown in
 * {@link HolyGrailDimensionEvaluation} is always the raw, unresolved value; only
 * `overallHardEligibility` uses the resolved one.
 */
export function resolveDimensionOutcome(
  rawStatus: HolyGrailHardEligibilityStatus,
  policy: HolyGrailDimensionBlockingPolicy,
): HolyGrailHardEligibilityStatus {
  if (rawStatus === 'UNKNOWN' && policy === 'BLOCKS_ON_UNKNOWN') {
    return 'FAIL';
  }
  return rawStatus;
}

export interface HolyGrailDimensionEvaluation {
  readonly status: HolyGrailHardEligibilityStatus;
  /** Short stable code for logs/tests; no user-facing copy. */
  readonly reasonCode: string;
}

/** Internal flags derived from directional evaluation (no API schema). */
export interface HolyGrailEligibilityFlags {
  /**
   * Always false after Sprint 15 Story 1 — PARTNER_WANTS_CHILDREN removed.
   * Retained for matches list/detail wire contract.
   */
  readonly children_unsure: boolean;
}

export interface HolyGrailDirectionalEvaluationResult {
  readonly dimensions: Record<
    HolyGrailDimensionKey,
    HolyGrailDimensionEvaluation
  >;
  /** FAIL if any resolved dimension is FAIL; otherwise PASS. */
  readonly overallHardEligibility: 'PASS' | 'FAIL';
  readonly eligibilityFlags: HolyGrailEligibilityFlags;
}

/** Stored preferences overlaid with `searchOverrides` (same rules as Layer 3 effective prefs). */
export function mergeEffectiveMatchingPreferences(
  searcher: MatchingCanonicalModel,
): MatchingPreferences {
  const p = searcher.preferences;
  const o = searcher.searchOverrides;
  const e: MatchingPreferences = { ...p };
  if (o.acceptedPartnerGenders !== undefined)
    e.acceptedPartnerGenders = o.acceptedPartnerGenders;
  if (o.partnerAgeMin !== undefined) e.partnerAgeMin = o.partnerAgeMin;
  if (o.partnerAgeMax !== undefined) e.partnerAgeMax = o.partnerAgeMax;
  if (o.maxDistanceKm !== undefined) e.maxDistanceKm = o.maxDistanceKm;
  return e;
}

function d(
  status: HolyGrailHardEligibilityStatus,
  reasonCode: string,
): HolyGrailDimensionEvaluation {
  return { status, reasonCode };
}

function evalGender(
  pref: MatchingPreferences,
  facts: MatchingFacts,
): HolyGrailDimensionEvaluation {
  const genders = pref.acceptedPartnerGenders;
  if (genders === undefined || genders.length === 0) {
    return d('SKIPPED', 'GENDER_PREF_ABSENT');
  }
  const gid = facts.genderIdentity;
  if (gid === undefined || gid === GenderIdentity.PREFER_NOT_TO_SAY) {
    return d('UNKNOWN', 'PARTNER_GENDER_MISSING_OR_WITHHELD');
  }
  if (genders.some((g) => (g as string) === (gid as string))) {
    return d('PASS', 'GENDER_IN_ALLOWLIST');
  }
  return d('FAIL', 'GENDER_NOT_IN_ALLOWLIST');
}

function evalAge(
  pref: MatchingPreferences,
  facts: MatchingFacts,
  evaluatedAt: Date,
): HolyGrailDimensionEvaluation {
  const min = pref.partnerAgeMin;
  const max = pref.partnerAgeMax;
  if (min === undefined && max === undefined) {
    return d('SKIPPED', 'AGE_PREF_ABSENT');
  }
  const dob = facts.dateOfBirth;
  if (dob === undefined) {
    return d('UNKNOWN', 'PARTNER_DOB_MISSING');
  }
  const age = ageWholeYearsUtcFromYmd(dob, evaluatedAt);
  if (age === undefined) {
    return d('UNKNOWN', 'PARTNER_DOB_INVALID');
  }
  if (min !== undefined && age < min) {
    return d('FAIL', 'AGE_BELOW_MIN');
  }
  if (max !== undefined && age > max) {
    return d('FAIL', 'AGE_ABOVE_MAX');
  }
  return d('PASS', 'AGE_WITHIN_RANGE');
}

/** v1 canonical facts have no lat/lng anchor; `primaryLocationLabel` alone cannot enforce km. */
function evalProximity(
  pref: MatchingPreferences,
): HolyGrailDimensionEvaluation {
  if (pref.maxDistanceKm === undefined) {
    return d('SKIPPED', 'DISTANCE_PREF_ABSENT');
  }
  return d('SKIPPED', 'GEO_INSUFFICIENT_FOR_DISTANCE_KM');
}

function evaluateAll(
  pref: MatchingPreferences,
  counterpartyFacts: MatchingFacts,
  evaluatedAt: Date,
): Record<HolyGrailDimensionKey, HolyGrailDimensionEvaluation> {
  const out = {} as Record<HolyGrailDimensionKey, HolyGrailDimensionEvaluation>;
  out.GENDER = evalGender(pref, counterpartyFacts);
  out.AGE = evalAge(pref, counterpartyFacts, evaluatedAt);
  out.PROXIMITY = evalProximity(pref);
  return out;
}

function overallFromDimensions(
  dims: Record<HolyGrailDimensionKey, HolyGrailDimensionEvaluation>,
): 'PASS' | 'FAIL' {
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    const effective = resolveDimensionOutcome(
      dims[k].status,
      HOLY_GRAIL_DIMENSION_BLOCKING_POLICY[k],
    );
    if (effective === 'FAIL') {
      return 'FAIL';
    }
  }
  return 'PASS';
}

function eligibilityFlagsFromDimensions(): HolyGrailEligibilityFlags {
  return { children_unsure: false };
}

/**
 * Layer 3 — Hard eligibility: searcher effective preferences vs counterparty facts.
 * Effective prefs = per-field override from `searchOverrides` when set, else stored `preferences`.
 * No widening; absent preference → SKIPPED.
 *
 * Dimensions: GENDER, AGE, PROXIMITY only (Sprint 15 Story 1).
 * `children_unsure` is always false (PARTNER_WANTS_CHILDREN removed; wire retained).
 */
export function evaluateHolyGrailDirectional(args: {
  searcher: MatchingCanonicalModel;
  counterparty: MatchingCanonicalModel;
  evaluatedAt?: Date;
}): HolyGrailDirectionalEvaluationResult {
  const evaluatedAt = args.evaluatedAt ?? new Date();
  const pref = mergeEffectiveMatchingPreferences(args.searcher);
  const dimensions = evaluateAll(pref, args.counterparty.facts, evaluatedAt);
  return {
    dimensions,
    overallHardEligibility: overallFromDimensions(dimensions),
    eligibilityFlags: eligibilityFlagsFromDimensions(),
  };
}

// ─── Outcome telemetry (evidence base for Sprint 17) ───
// Pure, DI-free. Callers (e.g. MeMatchesService) accumulate and emit via obs.

export type HolyGrailDimensionOutcomeCounts = Record<
  HolyGrailDimensionKey,
  Record<HolyGrailHardEligibilityStatus, number>
>;

const ALL_HOLY_GRAIL_HARD_ELIGIBILITY_STATUSES: readonly HolyGrailHardEligibilityStatus[] =
  ['PASS', 'FAIL', 'UNKNOWN', 'SKIPPED', 'SOFT_PASS'];

export function emptyHolyGrailDimensionOutcomeCounts(): HolyGrailDimensionOutcomeCounts {
  const out = {} as HolyGrailDimensionOutcomeCounts;
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    out[k] = { PASS: 0, FAIL: 0, UNKNOWN: 0, SKIPPED: 0, SOFT_PASS: 0 };
  }
  return out;
}

/** Mutates `counts` in place — call once per directional evaluation. */
export function accumulateHolyGrailDimensionOutcomeCounts(
  counts: HolyGrailDimensionOutcomeCounts,
  evaluation: HolyGrailDirectionalEvaluationResult,
): void {
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    counts[k][evaluation.dimensions[k].status] += 1;
  }
}

/** `GENDER:PASS=3,FAIL=1,UNKNOWN=0,SKIPPED=0,SOFT_PASS=0;AGE:...` — stable, greppable. */
export function formatHolyGrailDimensionOutcomeCountsForLog(
  counts: HolyGrailDimensionOutcomeCounts,
): string {
  return HOLY_GRAIL_DIMENSION_KEYS.map((k) => {
    const perStatus = ALL_HOLY_GRAIL_HARD_ELIGIBILITY_STATUSES.map(
      (s) => `${s}=${counts[k][s]}`,
    ).join(',');
    return `${k}:${perStatus}`;
  }).join(';');
}
