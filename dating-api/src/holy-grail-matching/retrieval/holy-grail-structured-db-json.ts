/**
 * Deterministic parse of persisted JSON blobs → `HolyGrailProfileMappingInput` slices.
 * Invalid or unknown keys/values are omitted (sparse). No defaults.
 */

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
} from '../../canonical/matching-canonical.types';
import type {
  HolyGrailProfileMappingInput,
  HolyGrailStructuredFactsInput,
  HolyGrailStructuredPreferencesInput,
} from '../profile-sources.types';

const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

function enumSet<T extends string>(e: Record<string, T>): Set<string> {
  return new Set(Object.values(e));
}

function asPlainObject(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function pickEnum<T extends string>(v: unknown, allowed: Set<string>): T | undefined {
  if (typeof v !== 'string' || !allowed.has(v)) return undefined;
  return v as T;
}

function pickIntegerAge(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isInteger(v)) return undefined;
  if (v < 18 || v > 120) return undefined;
  return v;
}

function pickStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== 'string') return undefined;
    out.push(x);
  }
  return out;
}

/**
 * Parses `UserProfile.holyGrailStructuredFacts` JSON.
 * Supported keys: genderIdentity, dateOfBirth, childrenStatus, wantsChildren, smoking, alcoholUse, education, religion.
 */
export function parseHolyGrailStructuredFactsFromJson(
  raw: unknown,
): HolyGrailStructuredFactsInput | undefined {
  const o = asPlainObject(raw);
  if (!o) return undefined;

  const genderIdentity = pickEnum<GenderIdentity>(o.genderIdentity, enumSet(GenderIdentity));
  const dateOfBirth =
    typeof o.dateOfBirth === 'string' && DOB_RE.test(o.dateOfBirth) ? o.dateOfBirth : undefined;
  const childrenStatus = pickEnum(o.childrenStatus, enumSet(ChildrenStatusSelf)) as
    | ChildrenStatusSelf
    | undefined;
  const wantsChildren = pickEnum(o.wantsChildren, enumSet(WantsChildrenSelf)) as
    | WantsChildrenSelf
    | undefined;
  const smoking = pickEnum(o.smoking, enumSet(SmokingFrequencySelf)) as SmokingFrequencySelf | undefined;
  const alcoholUse = pickEnum(o.alcoholUse, enumSet(AlcoholUseSelf)) as AlcoholUseSelf | undefined;
  const education = pickEnum(o.education, enumSet(EducationLevelSelf)) as EducationLevelSelf | undefined;
  const religion = pickEnum(o.religion, enumSet(ReligionSelf)) as ReligionSelf | undefined;

  const merged = {
    ...(genderIdentity !== undefined ? { genderIdentity } : {}),
    ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
    ...(childrenStatus !== undefined ? { childrenStatus } : {}),
    ...(wantsChildren !== undefined ? { wantsChildren } : {}),
    ...(smoking !== undefined ? { smoking } : {}),
    ...(alcoholUse !== undefined ? { alcoholUse } : {}),
    ...(education !== undefined ? { education } : {}),
    ...(religion !== undefined ? { religion } : {}),
  } as HolyGrailStructuredFactsInput;

  return Object.keys(merged).length === 0 ? undefined : merged;
}

function parseAcceptedPartnerGendersJson(v: unknown): AcceptedPartnerGender[] | undefined {
  const arr = pickStringArray(v);
  if (!arr) return undefined;
  const allowed = enumSet(AcceptedPartnerGender);
  const out: AcceptedPartnerGender[] = [];
  for (const s of arr) {
    if (!allowed.has(s)) return undefined;
    out.push(s as AcceptedPartnerGender);
  }
  return out.length === 0 ? undefined : out;
}

function parseReligionListJson(v: unknown): ReligionSelf[] | undefined {
  const arr = pickStringArray(v);
  if (!arr) return undefined;
  const allowed = enumSet(ReligionSelf);
  const out: ReligionSelf[] = [];
  const seen = new Set<string>();
  for (const s of arr) {
    if (!allowed.has(s)) return undefined;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s as ReligionSelf);
  }
  return out.length === 0 ? undefined : out;
}

/**
 * Parses `UserProfile.holyGrailStructuredPreferences` JSON.
 * Does not read maxDistanceKm (geo). Supported keys match wired MVP dimensions only.
 */
export function parseHolyGrailStructuredPreferencesFromJson(
  raw: unknown,
): HolyGrailStructuredPreferencesInput | undefined {
  const o = asPlainObject(raw);
  if (!o) return undefined;

  const genders = parseAcceptedPartnerGendersJson(o.acceptedPartnerGenders);
  let partnerAgeMin = pickIntegerAge(o.partnerAgeMin);
  let partnerAgeMax = pickIntegerAge(o.partnerAgeMax);
  if (partnerAgeMin !== undefined && partnerAgeMax !== undefined && partnerAgeMin > partnerAgeMax) {
    partnerAgeMin = undefined;
    partnerAgeMax = undefined;
  }
  const minimumPartnerEducation = pickEnum(o.minimumPartnerEducation, enumSet(MinimumPartnerEducation)) as
    | MinimumPartnerEducation
    | undefined;
  const acceptedPartnerSmoking = pickEnum(o.acceptedPartnerSmoking, enumSet(AcceptedPartnerSmoking)) as
    | AcceptedPartnerSmoking
    | undefined;
  const acceptedPartnerAlcohol = pickEnum(o.acceptedPartnerAlcohol, enumSet(AcceptedPartnerAlcohol)) as
    | AcceptedPartnerAlcohol
    | undefined;
  const partnerWantsChildren = pickEnum(o.partnerWantsChildren, enumSet(PartnerWantsChildrenRequirement)) as
    | PartnerWantsChildrenRequirement
    | undefined;
  const partnerHasChildren = pickEnum(o.partnerHasChildren, enumSet(PartnerHasChildrenAcceptance)) as
    | PartnerHasChildrenAcceptance
    | undefined;
  const acceptedPartnerReligions = parseReligionListJson(o.acceptedPartnerReligions);

  const merged = {
    ...(genders !== undefined ? { acceptedPartnerGenders: genders } : {}),
    ...(partnerAgeMin !== undefined ? { partnerAgeMin } : {}),
    ...(partnerAgeMax !== undefined ? { partnerAgeMax } : {}),
    ...(minimumPartnerEducation !== undefined ? { minimumPartnerEducation } : {}),
    ...(acceptedPartnerSmoking !== undefined ? { acceptedPartnerSmoking } : {}),
    ...(acceptedPartnerAlcohol !== undefined ? { acceptedPartnerAlcohol } : {}),
    ...(partnerWantsChildren !== undefined ? { partnerWantsChildren } : {}),
    ...(partnerHasChildren !== undefined ? { partnerHasChildren } : {}),
    ...(acceptedPartnerReligions !== undefined ? { acceptedPartnerReligions } : {}),
  } as HolyGrailStructuredPreferencesInput;

  return Object.keys(merged).length === 0 ? undefined : merged;
}

export function buildHolyGrailProfileMappingInputFromDbRow(args: {
  profileId: string;
  extractionV2: {
    interests_self: string[];
    interests: string[];
    lifestyleTraits: string[];
  } | null;
  holyGrailStructuredFacts: unknown;
  holyGrailStructuredPreferences: unknown;
}): HolyGrailProfileMappingInput {
  const sf = parseHolyGrailStructuredFactsFromJson(args.holyGrailStructuredFacts);
  const sp = parseHolyGrailStructuredPreferencesFromJson(args.holyGrailStructuredPreferences);

  return {
    profileId: args.profileId,
    ...(args.extractionV2
      ? {
          extractionArrays: {
            interests_self: args.extractionV2.interests_self,
            interests: args.extractionV2.interests,
            lifestyleTraits: args.extractionV2.lifestyleTraits,
          },
        }
      : {}),
    ...(sf !== undefined ? { structuredFacts: sf } : {}),
    ...(sp !== undefined ? { structuredPreferences: sp } : {}),
  };
}
