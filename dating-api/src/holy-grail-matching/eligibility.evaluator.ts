/**
 * Layer-3 Holy Grail hard eligibility (structured prefs vs counterparty facts).
 * Kept dimensions: GENDER, AGE, PROXIMITY only (Sprint 15 Story 1).
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
 * Per-dimension Layer 3 outcome (internal). Only `FAIL` blocks `overallHardEligibility`;
 * `PASS` and `SOFT_PASS` allow; `SKIPPED` is inert.
 */
export type HolyGrailHardEligibilityStatus =
  | 'PASS'
  | 'FAIL'
  | 'SKIPPED'
  | 'SOFT_PASS';

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
  /** FAIL if any dimension is FAIL; otherwise PASS (SKIPPED / SOFT_PASS / PASS do not block). */
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
    return d('FAIL', 'PARTNER_GENDER_MISSING_OR_WITHHELD');
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
    return d('FAIL', 'PARTNER_DOB_MISSING');
  }
  const age = ageWholeYearsUtcFromYmd(dob, evaluatedAt);
  if (age === undefined) {
    return d('FAIL', 'PARTNER_DOB_INVALID');
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
    if (dims[k].status === 'FAIL') {
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
