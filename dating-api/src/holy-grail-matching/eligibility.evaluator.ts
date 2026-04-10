import type { MatchingCanonicalModel, MatchingFacts, MatchingPreferences } from '../canonical/matching-canonical.types';
import {
  AcceptedPartnerAlcohol,
  AcceptedPartnerSmoking,
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  GenderIdentity,
  MinimumPartnerEducation,
  PartnerHasChildrenAcceptance,
  PartnerWantsChildrenRequirement,
  ReligionSelf,
  SmokingFrequencySelf,
  WantsChildrenSelf,
} from '../canonical/matching-canonical.types';
import { HOLY_GRAIL_DIMENSION_KEYS, type HolyGrailDimensionKey } from './holy-grail-dimensions';

/**
 * Per-dimension Layer 3 outcome (internal). Only `FAIL` blocks `overallHardEligibility`;
 * `PASS` and `SOFT_PASS` allow; `SKIPPED` is inert.
 */
export type HolyGrailHardEligibilityStatus = 'PASS' | 'FAIL' | 'SKIPPED' | 'SOFT_PASS';

export interface HolyGrailDimensionEvaluation {
  readonly status: HolyGrailHardEligibilityStatus;
  /** Short stable code for logs/tests; no user-facing copy. */
  readonly reasonCode: string;
}

/** Internal flags derived from directional evaluation (no API schema). */
export interface HolyGrailEligibilityFlags {
  /** True when `PARTNER_WANTS_CHILDREN` is SOFT_PASS (MUST_WANT × partner UNSURE). */
  readonly children_unsure: boolean;
}

export interface HolyGrailDirectionalEvaluationResult {
  readonly dimensions: Record<HolyGrailDimensionKey, HolyGrailDimensionEvaluation>;
  /** FAIL if any dimension is FAIL; otherwise PASS (SKIPPED / SOFT_PASS / PASS do not block). */
  readonly overallHardEligibility: 'PASS' | 'FAIL';
  readonly eligibilityFlags: HolyGrailEligibilityFlags;
}

function mergeEffectivePreferences(searcher: MatchingCanonicalModel): MatchingPreferences {
  const p = searcher.preferences;
  const o = searcher.searchOverrides;
  const e: MatchingPreferences = { ...p };
  if (o.acceptedPartnerGenders !== undefined) e.acceptedPartnerGenders = o.acceptedPartnerGenders;
  if (o.partnerAgeMin !== undefined) e.partnerAgeMin = o.partnerAgeMin;
  if (o.partnerAgeMax !== undefined) e.partnerAgeMax = o.partnerAgeMax;
  if (o.minimumPartnerEducation !== undefined) e.minimumPartnerEducation = o.minimumPartnerEducation;
  if (o.acceptedPartnerSmoking !== undefined) e.acceptedPartnerSmoking = o.acceptedPartnerSmoking;
  if (o.acceptedPartnerAlcohol !== undefined) e.acceptedPartnerAlcohol = o.acceptedPartnerAlcohol;
  if (o.partnerWantsChildren !== undefined) e.partnerWantsChildren = o.partnerWantsChildren;
  if (o.partnerHasChildren !== undefined) e.partnerHasChildren = o.partnerHasChildren;
  if (o.acceptedPartnerReligions !== undefined) e.acceptedPartnerReligions = o.acceptedPartnerReligions;
  if (o.maxDistanceKm !== undefined) e.maxDistanceKm = o.maxDistanceKm;
  return e;
}

function d(status: HolyGrailHardEligibilityStatus, reasonCode: string): HolyGrailDimensionEvaluation {
  return { status, reasonCode };
}

function ageWholeYearsUtc(dateOfBirthYmd: string, ref: Date): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirthYmd);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ty = ref.getUTCFullYear();
  const tm = ref.getUTCMonth();
  const td = ref.getUTCDate();
  let age = ty - y;
  if (tm < mo - 1 || (tm === mo - 1 && td < d)) age -= 1;
  return age;
}

function educationRankFact(e: EducationLevelSelf | undefined): number | undefined {
  if (e === undefined) return undefined;
  const R: Partial<Record<EducationLevelSelf, number>> = {
    [EducationLevelSelf.LESS_THAN_HIGH_SCHOOL]: 0,
    [EducationLevelSelf.HIGH_SCHOOL]: 1,
    [EducationLevelSelf.SOME_COLLEGE]: 2,
    [EducationLevelSelf.BACHELORS]: 3,
    [EducationLevelSelf.GRADUATE]: 4,
    [EducationLevelSelf.DOCTORATE]: 5,
  };
  return R[e];
}

function educationMinRank(min: MinimumPartnerEducation): number | undefined {
  const T: Record<MinimumPartnerEducation, number | undefined> = {
    [MinimumPartnerEducation.ANY]: undefined,
    [MinimumPartnerEducation.HIGH_SCHOOL]: 1,
    [MinimumPartnerEducation.SOME_COLLEGE]: 2,
    [MinimumPartnerEducation.BACHELORS]: 3,
    [MinimumPartnerEducation.GRADUATE]: 4,
  };
  return T[min];
}

function evalGender(pref: MatchingPreferences, facts: MatchingFacts): HolyGrailDimensionEvaluation {
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
  const age = ageWholeYearsUtc(dob, evaluatedAt);
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

function evalEducation(pref: MatchingPreferences, facts: MatchingFacts): HolyGrailDimensionEvaluation {
  const minE = pref.minimumPartnerEducation;
  if (minE === undefined || minE === MinimumPartnerEducation.ANY) {
    return d('SKIPPED', 'EDUCATION_PREF_INACTIVE');
  }
  const R = educationRankFact(facts.education);
  const T = educationMinRank(minE);
  if (T === undefined) {
    return d('SKIPPED', 'EDUCATION_PREF_INACTIVE');
  }
  if (
    facts.education === undefined ||
    facts.education === EducationLevelSelf.PREFER_NOT_TO_SAY ||
    facts.education === EducationLevelSelf.OTHER ||
    R === undefined
  ) {
    return d('FAIL', 'PARTNER_EDUCATION_UNRANKED_OR_MISSING');
  }
  if (R >= T) {
    return d('PASS', 'EDUCATION_MEETS_FLOOR');
  }
  return d('FAIL', 'EDUCATION_BELOW_FLOOR');
}

function smokingMatrix(
  row: AcceptedPartnerSmoking,
  col: SmokingFrequencySelf,
): 'PASS' | 'FAIL' | 'WITHHELD' {
  if (col === SmokingFrequencySelf.PREFER_NOT_TO_SAY) {
    return 'WITHHELD';
  }
  if (row === AcceptedPartnerSmoking.ANY) {
    return 'PASS';
  }
  const isNever = col === SmokingFrequencySelf.NEVER;
  const isFormer = col === SmokingFrequencySelf.FORMER;
  const isSocial = col === SmokingFrequencySelf.SOCIAL;
  const isRegular = col === SmokingFrequencySelf.REGULAR;
  if (row === AcceptedPartnerSmoking.NONE_ONLY) {
    if (isNever || isFormer) return 'PASS';
    if (isSocial || isRegular) return 'FAIL';
  }
  if (row === AcceptedPartnerSmoking.SOCIAL_OK) {
    if (isNever || isFormer || isSocial) return 'PASS';
    if (isRegular) return 'FAIL';
  }
  return 'FAIL';
}

function evalSmoking(pref: MatchingPreferences, facts: MatchingFacts): HolyGrailDimensionEvaluation {
  const row = pref.acceptedPartnerSmoking;
  if (row === undefined || row === AcceptedPartnerSmoking.ANY) {
    return d('SKIPPED', 'SMOKING_PREF_INACTIVE');
  }
  const col = facts.smoking;
  if (col === undefined) {
    return d('FAIL', 'PARTNER_SMOKING_MISSING');
  }
  const cell = smokingMatrix(row, col);
  if (cell === 'WITHHELD') {
    return d('FAIL', 'PARTNER_SMOKING_WITHHELD');
  }
  return cell === 'PASS' ? d('PASS', 'SMOKING_MATRIX_PASS') : d('FAIL', 'SMOKING_MATRIX_FAIL');
}

function alcoholMatrix(
  row: AcceptedPartnerAlcohol,
  col: AlcoholUseSelf,
): 'PASS' | 'FAIL' | 'WITHHELD' {
  if (col === AlcoholUseSelf.PREFER_NOT_TO_SAY) {
    return 'WITHHELD';
  }
  if (row === AcceptedPartnerAlcohol.ANY) {
    return 'PASS';
  }
  const isNever = col === AlcoholUseSelf.NEVER;
  const isRare = col === AlcoholUseSelf.RARE;
  const isMod = col === AlcoholUseSelf.MODERATE;
  const isFreq = col === AlcoholUseSelf.FREQUENT;
  if (row === AcceptedPartnerAlcohol.NONE_ONLY) {
    if (isNever) return 'PASS';
    if (isRare || isMod || isFreq) return 'FAIL';
  }
  if (row === AcceptedPartnerAlcohol.MODERATE_OK) {
    if (isNever || isRare || isMod) return 'PASS';
    if (isFreq) return 'FAIL';
  }
  return 'FAIL';
}

function evalAlcohol(pref: MatchingPreferences, facts: MatchingFacts): HolyGrailDimensionEvaluation {
  const row = pref.acceptedPartnerAlcohol;
  if (row === undefined || row === AcceptedPartnerAlcohol.ANY) {
    return d('SKIPPED', 'ALCOHOL_PREF_INACTIVE');
  }
  const col = facts.alcoholUse;
  if (col === undefined) {
    return d('FAIL', 'PARTNER_ALCOHOL_MISSING');
  }
  const cell = alcoholMatrix(row, col);
  if (cell === 'WITHHELD') {
    return d('FAIL', 'PARTNER_ALCOHOL_WITHHELD');
  }
  return cell === 'PASS' ? d('PASS', 'ALCOHOL_MATRIX_PASS') : d('FAIL', 'ALCOHOL_MATRIX_FAIL');
}

function evalPartnerWantsChildren(
  pref: MatchingPreferences,
  facts: MatchingFacts,
): HolyGrailDimensionEvaluation {
  const req = pref.partnerWantsChildren;
  if (req === undefined || req === PartnerWantsChildrenRequirement.NO_REQUIREMENT) {
    return d('SKIPPED', 'WANTS_CHILDREN_PREF_INACTIVE');
  }
  const w = facts.wantsChildren;
  if (w === undefined || w === WantsChildrenSelf.PREFER_NOT_TO_SAY) {
    return d('FAIL', 'PARTNER_WANTS_CHILDREN_UNKNOWN');
  }
  if (req === PartnerWantsChildrenRequirement.MUST_WANT) {
    if (w === WantsChildrenSelf.YES) return d('PASS', 'WANTS_CHILDREN_MUST_WANT_OK');
    if (w === WantsChildrenSelf.UNSURE) return d('SOFT_PASS', 'WANTS_CHILDREN_MUST_WANT_UNSURE_SOFT');
    return d('FAIL', 'WANTS_CHILDREN_MUST_WANT_FAIL');
  }
  if (w === WantsChildrenSelf.NO) return d('PASS', 'WANTS_CHILDREN_MUST_NOT_WANT_OK');
  return d('FAIL', 'WANTS_CHILDREN_MUST_NOT_WANT_FAIL');
}

function evalPartnerHasChildren(
  pref: MatchingPreferences,
  facts: MatchingFacts,
): HolyGrailDimensionEvaluation {
  const acc = pref.partnerHasChildren;
  if (acc === undefined || acc === PartnerHasChildrenAcceptance.NO_REQUIREMENT) {
    return d('SKIPPED', 'HAS_CHILDREN_PREF_INACTIVE');
  }
  const cs = facts.childrenStatus;
  if (cs === undefined || cs === ChildrenStatusSelf.PREFER_NOT_TO_SAY) {
    return d('FAIL', 'PARTNER_CHILDREN_STATUS_UNKNOWN');
  }
  const hasKids = cs === ChildrenStatusSelf.YES_LIVES_WITH_ME || cs === ChildrenStatusSelf.YES_NOT_WITH_ME;
  if (acc === PartnerHasChildrenAcceptance.ACCEPT) {
    return d('PASS', 'HAS_CHILDREN_ACCEPT_OK');
  }
  if (!hasKids) {
    return d('PASS', 'HAS_CHILDREN_DOES_NOT_ACCEPT_OK');
  }
  return d('FAIL', 'HAS_CHILDREN_DOES_NOT_ACCEPT_FAIL');
}

function evalReligion(pref: MatchingPreferences, facts: MatchingFacts): HolyGrailDimensionEvaluation {
  const list = pref.acceptedPartnerReligions;
  if (list === undefined || list.length === 0) {
    return d('SKIPPED', 'RELIGION_PREF_ABSENT');
  }
  const rel = facts.religion;
  if (rel === undefined || rel === ReligionSelf.PREFER_NOT_TO_SAY) {
    return d('FAIL', 'PARTNER_RELIGION_MISSING_OR_WITHHELD');
  }
  if (list.includes(rel)) {
    return d('PASS', 'RELIGION_IN_ALLOWLIST');
  }
  return d('FAIL', 'RELIGION_NOT_IN_ALLOWLIST');
}

/** v1 canonical facts have no lat/lng anchor; `primaryLocationLabel` alone cannot enforce km. */
function evalProximity(pref: MatchingPreferences): HolyGrailDimensionEvaluation {
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
  out.RELIGION = evalReligion(pref, counterpartyFacts);
  out.EDUCATION = evalEducation(pref, counterpartyFacts);
  out.SMOKING = evalSmoking(pref, counterpartyFacts);
  out.ALCOHOL = evalAlcohol(pref, counterpartyFacts);
  out.PARTNER_HAS_CHILDREN = evalPartnerHasChildren(pref, counterpartyFacts);
  out.PARTNER_WANTS_CHILDREN = evalPartnerWantsChildren(pref, counterpartyFacts);
  out.PROXIMITY = evalProximity(pref);
  return out;
}

function overallFromDimensions(dims: Record<HolyGrailDimensionKey, HolyGrailDimensionEvaluation>): 'PASS' | 'FAIL' {
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    if (dims[k].status === 'FAIL') {
      return 'FAIL';
    }
  }
  return 'PASS';
}

function eligibilityFlagsFromDimensions(
  dims: Record<HolyGrailDimensionKey, HolyGrailDimensionEvaluation>,
): HolyGrailEligibilityFlags {
  return {
    children_unsure: dims.PARTNER_WANTS_CHILDREN.status === 'SOFT_PASS',
  };
}

/**
 * Layer 3 — Hard eligibility: searcher effective preferences vs counterparty facts.
 * Effective prefs = per-field override from `searchOverrides` when set, else stored `preferences`.
 * No widening; absent preference → SKIPPED. Explicit ANY / NO_REQUIREMENT → SKIPPED.
 * `SOFT_PASS` (currently only MUST_WANT × partner UNSURE on children) allows eligibility and sets `eligibilityFlags.children_unsure`.
 */
export function evaluateHolyGrailDirectional(args: {
  searcher: MatchingCanonicalModel;
  counterparty: MatchingCanonicalModel;
  evaluatedAt?: Date;
}): HolyGrailDirectionalEvaluationResult {
  const evaluatedAt = args.evaluatedAt ?? new Date();
  const pref = mergeEffectivePreferences(args.searcher);
  const dimensions = evaluateAll(pref, args.counterparty.facts, evaluatedAt);
  return {
    dimensions,
    overallHardEligibility: overallFromDimensions(dimensions),
    eligibilityFlags: eligibilityFlagsFromDimensions(dimensions),
  };
}
