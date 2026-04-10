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
  SmokingFrequencySelf,
  WantsChildrenSelf,
} from '../canonical/matching-canonical.types';

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

export class HolyGrailStructuredWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HolyGrailStructuredWriteError';
  }
}

function enumSet<T extends string>(e: Record<string, T>): Set<string> {
  return new Set(Object.values(e));
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
  if (v < 18 || v > 120) {
    throw new HolyGrailStructuredWriteError(`${field} must be in [18, 120]`);
  }
  return v;
}

const FACT_KEYS = new Set([
  'genderIdentity',
  'dateOfBirth',
  'childrenStatus',
  'wantsChildren',
  'smoking',
  'alcoholUse',
  'education',
  'religion',
]);

const PREF_KEYS = new Set([
  'acceptedPartnerGenders',
  'partnerAgeMin',
  'partnerAgeMax',
  'minimumPartnerEducation',
  'acceptedPartnerSmoking',
  'acceptedPartnerAlcohol',
  'partnerWantsChildren',
  'partnerHasChildren',
  'acceptedPartnerReligions',
]);

function normalizeFactValue(key: string, v: unknown): unknown {
  switch (key) {
    case 'genderIdentity':
      return requireEnum(v, enumSet(GenderIdentity), 'genderIdentity');
    case 'dateOfBirth':
      if (typeof v !== 'string' || !DOB_RE.test(v)) {
        throw new HolyGrailStructuredWriteError(`Invalid dateOfBirth: ${JSON.stringify(v)}`);
      }
      return v;
    case 'childrenStatus':
      return requireEnum(v, enumSet(ChildrenStatusSelf), 'childrenStatus');
    case 'wantsChildren':
      return requireEnum(v, enumSet(WantsChildrenSelf), 'wantsChildren');
    case 'smoking':
      return requireEnum(v, enumSet(SmokingFrequencySelf), 'smoking');
    case 'alcoholUse':
      return requireEnum(v, enumSet(AlcoholUseSelf), 'alcoholUse');
    case 'education':
      return requireEnum(v, enumSet(EducationLevelSelf), 'education');
    case 'religion':
      return requireEnum(v, enumSet(ReligionSelf), 'religion');
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
  const allowed = enumSet(AcceptedPartnerGender);
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
  const allowed = enumSet(ReligionSelf);
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
      return requireEnum(v, enumSet(MinimumPartnerEducation), 'minimumPartnerEducation');
    case 'acceptedPartnerSmoking':
      return requireEnum(v, enumSet(AcceptedPartnerSmoking), 'acceptedPartnerSmoking');
    case 'acceptedPartnerAlcohol':
      return requireEnum(v, enumSet(AcceptedPartnerAlcohol), 'acceptedPartnerAlcohol');
    case 'partnerWantsChildren':
      return requireEnum(v, enumSet(PartnerWantsChildrenRequirement), 'partnerWantsChildren');
    case 'partnerHasChildren':
      return requireEnum(v, enumSet(PartnerHasChildrenAcceptance), 'partnerHasChildren');
    case 'acceptedPartnerReligions':
      return normalizeReligionList(v);
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
    if (!FACT_KEYS.has(key)) {
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
    if (!PREF_KEYS.has(key)) {
      throw new HolyGrailStructuredWriteError(`Unknown holyGrailStructuredPreferences key: ${key}`);
    }
    if (raw === null) {
      delete base[key];
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
