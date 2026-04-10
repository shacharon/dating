/**
 * Strict validation + shallow merge for persisted Holy Grail JSON columns.
 * Aligns with `holy-grail-structured-db-json.ts` read path (same keys, enums, no geo).
 */

import { Prisma } from '@prisma/client';
import {
  AcceptedPartnerGender,
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
  SIMILARITY_PREFERENCE_VALUES,
  SmokingFrequencySelf,
  WantsChildrenSelf,
} from '../canonical/matching-canonical.types';
import { matchingCanonicalEnumMemberSet } from './holy-grail-canonical-enum';
import {
  HOLY_GRAIL_PARTNER_AGE_INTEGER_MAX,
  HOLY_GRAIL_PARTNER_AGE_INTEGER_MIN,
  HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEY_SET,
  HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEY_SET,
  isHolyGrailDobYmdString,
} from './holy-grail-structured-contract';

const SIMILARITY_PREFERENCE_SET = new Set<string>(SIMILARITY_PREFERENCE_VALUES);

export class HolyGrailStructuredWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HolyGrailStructuredWriteError';
  }
}

function asPlainObject(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function requirePatchObject(patch: unknown, label: string): Record<string, unknown> {
  if (patch === undefined) {
    throw new HolyGrailStructuredWriteError(`${label} is undefined`);
  }
  const o = asPlainObject(patch);
  if (!o) {
    throw new HolyGrailStructuredWriteError(`${label} must be a plain object`);
  }
  return o;
}

function requireEnum(v: unknown, allowed: Set<string>, field: string): string {
  if (typeof v !== 'string' || !allowed.has(v)) {
    throw new HolyGrailStructuredWriteError(`Invalid ${field}: ${JSON.stringify(v)}`);
  }
  return v;
}

function requireIntegerAge(v: unknown, field: string): number {
  if (typeof v !== 'number' || !Number.isInteger(v)) {
    throw new HolyGrailStructuredWriteError(`${field} must be an integer`);
  }
  if (v < HOLY_GRAIL_PARTNER_AGE_INTEGER_MIN || v > HOLY_GRAIL_PARTNER_AGE_INTEGER_MAX) {
    throw new HolyGrailStructuredWriteError(`${field} must be in [18, 120]`);
  }
  return v;
}

function normalizeFactValue(key: string, v: unknown): unknown {
  switch (key) {
    case 'genderIdentity':
      return requireEnum(v, matchingCanonicalEnumMemberSet(GenderIdentity), 'genderIdentity');
    case 'dateOfBirth':
      if (typeof v !== 'string' || !isHolyGrailDobYmdString(v)) {
        throw new HolyGrailStructuredWriteError(`Invalid dateOfBirth: ${JSON.stringify(v)}`);
      }
      return v;
    case 'childrenStatus':
      return requireEnum(v, matchingCanonicalEnumMemberSet(ChildrenStatusSelf), 'childrenStatus');
    case 'wantsChildren':
      return requireEnum(v, matchingCanonicalEnumMemberSet(WantsChildrenSelf), 'wantsChildren');
    case 'smoking':
      return requireEnum(v, matchingCanonicalEnumMemberSet(SmokingFrequencySelf), 'smoking');
    case 'alcoholUse':
      return requireEnum(v, matchingCanonicalEnumMemberSet(AlcoholUseSelf), 'alcoholUse');
    case 'education':
      return requireEnum(v, matchingCanonicalEnumMemberSet(EducationLevelSelf), 'education');
    case 'religion':
      return requireEnum(v, matchingCanonicalEnumMemberSet(ReligionSelf), 'religion');
    default:
      throw new HolyGrailStructuredWriteError(`Unsupported fact key: ${key}`);
  }
}

function normalizeGenders(v: unknown): string[] {
  if (!Array.isArray(v)) {
    throw new HolyGrailStructuredWriteError('acceptedPartnerGenders must be an array');
  }
  if (v.length === 0) {
    throw new HolyGrailStructuredWriteError('acceptedPartnerGenders must be non-empty when set');
  }
  const allowed = matchingCanonicalEnumMemberSet(AcceptedPartnerGender);
  const out: string[] = [];
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (typeof x !== 'string' || !allowed.has(x)) {
      throw new HolyGrailStructuredWriteError(
        `Invalid acceptedPartnerGenders[${i}]: ${JSON.stringify(x)}`,
      );
    }
    out.push(x);
  }
  return out;
}

function normalizeReligionList(v: unknown): string[] {
  if (!Array.isArray(v)) {
    throw new HolyGrailStructuredWriteError('acceptedPartnerReligions must be an array');
  }
  if (v.length === 0) {
    return [];
  }
  const allowed = matchingCanonicalEnumMemberSet(ReligionSelf);
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (typeof x !== 'string' || !allowed.has(x)) {
      throw new HolyGrailStructuredWriteError(
        `Invalid acceptedPartnerReligions[${i}]: ${JSON.stringify(x)}`,
      );
    }
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

function normalizePrefValue(key: string, v: unknown): unknown {
  switch (key) {
    case 'acceptedPartnerGenders':
      return normalizeGenders(v);
    case 'partnerAgeMin':
      return requireIntegerAge(v, 'partnerAgeMin');
    case 'partnerAgeMax':
      return requireIntegerAge(v, 'partnerAgeMax');
    case 'minimumPartnerEducation':
      return requireEnum(v, matchingCanonicalEnumMemberSet(MinimumPartnerEducation), 'minimumPartnerEducation');
    case 'acceptedPartnerSmoking':
      return requireEnum(v, matchingCanonicalEnumMemberSet(AcceptedPartnerSmoking), 'acceptedPartnerSmoking');
    case 'acceptedPartnerAlcohol':
      return requireEnum(v, matchingCanonicalEnumMemberSet(AcceptedPartnerAlcohol), 'acceptedPartnerAlcohol');
    case 'partnerWantsChildren':
      return requireEnum(v, matchingCanonicalEnumMemberSet(PartnerWantsChildrenRequirement), 'partnerWantsChildren');
    case 'partnerHasChildren':
      return requireEnum(v, matchingCanonicalEnumMemberSet(PartnerHasChildrenAcceptance), 'partnerHasChildren');
    case 'acceptedPartnerReligions':
      return normalizeReligionList(v);
    case 'similarityPreference':
      if (v === null) return null;
      return requireEnum(v, SIMILARITY_PREFERENCE_SET, 'similarityPreference');
    default:
      throw new HolyGrailStructuredWriteError(`Unsupported preference key: ${key}`);
  }
}

function assertAgeBoundsConsistent(o: Record<string, unknown>): void {
  const min = o.partnerAgeMin;
  const max = o.partnerAgeMax;
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    throw new HolyGrailStructuredWriteError('partnerAgeMin must be <= partnerAgeMax');
  }
}

/**
 * Shallow-merge `patch` onto `existing` JSON. `null` patch value removes the key.
 * Unknown keys → error. Validates every set value strictly.
 */
export function mergeHolyGrailStructuredFactsPatch(
  existing: unknown,
  patch: unknown,
): Prisma.InputJsonValue {
  const p = requirePatchObject(patch, 'structuredFactsPatch');
  const base: Record<string, unknown> = { ...(asPlainObject(existing) ?? {}) };

  for (const [key, raw] of Object.entries(p)) {
    if (!HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEY_SET.has(key)) {
      throw new HolyGrailStructuredWriteError(`Unknown holyGrailStructuredFacts key: ${key}`);
    }
    if (raw === null) {
      delete base[key];
      continue;
    }
    base[key] = normalizeFactValue(key, raw);
  }

  return base as Prisma.InputJsonValue;
}

export function mergeHolyGrailStructuredPreferencesPatch(
  existing: unknown,
  patch: unknown,
): Prisma.InputJsonValue {
  const p = requirePatchObject(patch, 'structuredPreferencesPatch');
  const base: Record<string, unknown> = { ...(asPlainObject(existing) ?? {}) };

  for (const [key, raw] of Object.entries(p)) {
    if (!HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEY_SET.has(key)) {
      throw new HolyGrailStructuredWriteError(`Unknown holyGrailStructuredPreferences key: ${key}`);
    }
    if (raw === null) {
      if (key === 'similarityPreference') {
        base[key] = null;
      } else {
        delete base[key];
      }
      continue;
    }
    if (key === 'acceptedPartnerReligions' && Array.isArray(raw) && raw.length === 0) {
      delete base[key];
      continue;
    }
    base[key] = normalizePrefValue(key, raw);
  }

  assertAgeBoundsConsistent(base);
  return base as Prisma.InputJsonValue;
}
