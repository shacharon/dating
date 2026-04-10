/**
 * Deterministic parse of persisted JSON blobs → `HolyGrailProfileMappingInput` slices.
 * Invalid or unknown keys/values are omitted (sparse). No defaults.
 * Mapper-only keys (see `holy-grail-structured-contract.ts` `*_MAPPER_ONLY_KEYS`) are **never** read here;
 * if they appear in legacy JSON they are ignored (writes still reject them).
 *
 * **Canonical DB → matching path:** `buildHolyGrailProfileMappingInputFromDbRow` (this module) →
 * `mapProfileSourceToMatchingCanonical`. Do not add a second parser for `holyGrailStructured*` columns.
 * HG ranking five signals are read from `ProfileSignalSnapshot` self typed columns (`HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT`).
 * Canonical **personality (v1+v2 trait tags)**, **lifestyle (v1+v2 tags)**, and **interest tags (v1+v2)** are merged from `aboutMe` / `aboutPartner` (deterministic extractors).
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
  SIMILARITY_PREFERENCE_VALUES,
  SmokingFrequencySelf,
  WantsChildrenSelf,
  type MatchingRankingSignalsSnapshot,
  type SimilarityPreference,
} from '../../canonical/matching-canonical.types';
import type {
  HolyGrailProfileMappingInput,
  HolyGrailStructuredFactsPersisted,
  HolyGrailStructuredPreferencesPersisted,
} from '../profile-sources.types';
import {
  buildHolyGrailRankingSignalsFromDbSelfRow,
  type ProfileSignalSelfRow,
} from '../holy-grail-ranking-signals-from-db';
import { extractInterestTagsV1FromFreeText } from '../interest-tags-text.extract';
import { extractLifestyleSignalsFromFreeText } from '../lifestyle-signals-text.extract';
import { extractPersonalityTraitsFromFreeText } from '../personality-traits-text.extract';
import {
  matchingCanonicalEnumMemberSet,
  pickMatchingCanonicalEnumMember,
} from '../holy-grail-canonical-enum';
import {
  HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS,
  HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS,
  pickHolyGrailDateOfBirthDbJson,
  tryParseHolyGrailPartnerAgeInteger,
} from '../holy-grail-structured-contract';

/** Compile-time guard: extend parser when `HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS` grows. */
const _holyGrailDbJsonFactsCoverage: Record<(typeof HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS)[number], true> = {
  genderIdentity: true,
  dateOfBirth: true,
  childrenStatus: true,
  wantsChildren: true,
  smoking: true,
  alcoholUse: true,
  education: true,
  religion: true,
};

/** Compile-time guard: extend parser when `HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS` grows. */
const _holyGrailDbJsonPrefsCoverage: Record<
  (typeof HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS)[number],
  true
> = {
  acceptedPartnerGenders: true,
  partnerAgeMin: true,
  partnerAgeMax: true,
  minimumPartnerEducation: true,
  acceptedPartnerSmoking: true,
  acceptedPartnerAlcohol: true,
  partnerWantsChildren: true,
  partnerHasChildren: true,
  acceptedPartnerReligions: true,
  similarityPreference: true,
};

void _holyGrailDbJsonFactsCoverage;
void _holyGrailDbJsonPrefsCoverage;

const SIMILARITY_PREFERENCE_PARSE_SET = new Set<string>(SIMILARITY_PREFERENCE_VALUES);

function asPlainObject(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
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
 * Supported keys: `HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS`.
 */
export function parseHolyGrailStructuredFactsFromJson(
  raw: unknown,
): HolyGrailStructuredFactsPersisted | undefined {
  const o = asPlainObject(raw);
  if (!o) return undefined;

  const genderIdentity = pickMatchingCanonicalEnumMember<GenderIdentity>(
    o.genderIdentity,
    matchingCanonicalEnumMemberSet(GenderIdentity),
  );
  const dateOfBirth = pickHolyGrailDateOfBirthDbJson(o.dateOfBirth);
  const childrenStatus = pickMatchingCanonicalEnumMember(o.childrenStatus, matchingCanonicalEnumMemberSet(ChildrenStatusSelf)) as
    | ChildrenStatusSelf
    | undefined;
  const wantsChildren = pickMatchingCanonicalEnumMember(o.wantsChildren, matchingCanonicalEnumMemberSet(WantsChildrenSelf)) as
    | WantsChildrenSelf
    | undefined;
  const smoking = pickMatchingCanonicalEnumMember(o.smoking, matchingCanonicalEnumMemberSet(SmokingFrequencySelf)) as SmokingFrequencySelf | undefined;
  const alcoholUse = pickMatchingCanonicalEnumMember(o.alcoholUse, matchingCanonicalEnumMemberSet(AlcoholUseSelf)) as AlcoholUseSelf | undefined;
  const education = pickMatchingCanonicalEnumMember(o.education, matchingCanonicalEnumMemberSet(EducationLevelSelf)) as EducationLevelSelf | undefined;
  const religion = pickMatchingCanonicalEnumMember(o.religion, matchingCanonicalEnumMemberSet(ReligionSelf)) as ReligionSelf | undefined;

  const merged = {
    ...(genderIdentity !== undefined ? { genderIdentity } : {}),
    ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
    ...(childrenStatus !== undefined ? { childrenStatus } : {}),
    ...(wantsChildren !== undefined ? { wantsChildren } : {}),
    ...(smoking !== undefined ? { smoking } : {}),
    ...(alcoholUse !== undefined ? { alcoholUse } : {}),
    ...(education !== undefined ? { education } : {}),
    ...(religion !== undefined ? { religion } : {}),
  } as HolyGrailStructuredFactsPersisted;

  return Object.keys(merged).length === 0 ? undefined : merged;
}

function parseAcceptedPartnerGendersJson(v: unknown): AcceptedPartnerGender[] | undefined {
  const arr = pickStringArray(v);
  if (!arr) return undefined;
  const allowed = matchingCanonicalEnumMemberSet(AcceptedPartnerGender);
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
  const allowed = matchingCanonicalEnumMemberSet(ReligionSelf);
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
 * Supported keys: `HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS` (excludes mapper-only `maxDistanceKm`).
 */
export function parseHolyGrailStructuredPreferencesFromJson(
  raw: unknown,
): HolyGrailStructuredPreferencesPersisted | undefined {
  const o = asPlainObject(raw);
  if (!o) return undefined;

  const genders = parseAcceptedPartnerGendersJson(o.acceptedPartnerGenders);
  let partnerAgeMin = tryParseHolyGrailPartnerAgeInteger(o.partnerAgeMin);
  let partnerAgeMax = tryParseHolyGrailPartnerAgeInteger(o.partnerAgeMax);
  if (partnerAgeMin !== undefined && partnerAgeMax !== undefined && partnerAgeMin > partnerAgeMax) {
    partnerAgeMin = undefined;
    partnerAgeMax = undefined;
  }
  const minimumPartnerEducation = pickMatchingCanonicalEnumMember(o.minimumPartnerEducation, matchingCanonicalEnumMemberSet(MinimumPartnerEducation)) as
    | MinimumPartnerEducation
    | undefined;
  const acceptedPartnerSmoking = pickMatchingCanonicalEnumMember(o.acceptedPartnerSmoking, matchingCanonicalEnumMemberSet(AcceptedPartnerSmoking)) as
    | AcceptedPartnerSmoking
    | undefined;
  const acceptedPartnerAlcohol = pickMatchingCanonicalEnumMember(o.acceptedPartnerAlcohol, matchingCanonicalEnumMemberSet(AcceptedPartnerAlcohol)) as
    | AcceptedPartnerAlcohol
    | undefined;
  const partnerWantsChildren = pickMatchingCanonicalEnumMember(o.partnerWantsChildren, matchingCanonicalEnumMemberSet(PartnerWantsChildrenRequirement)) as
    | PartnerWantsChildrenRequirement
    | undefined;
  const partnerHasChildren = pickMatchingCanonicalEnumMember(o.partnerHasChildren, matchingCanonicalEnumMemberSet(PartnerHasChildrenAcceptance)) as
    | PartnerHasChildrenAcceptance
    | undefined;
  const acceptedPartnerReligions = parseReligionListJson(o.acceptedPartnerReligions);

  let similarityPreference: SimilarityPreference | null | undefined;
  if (Object.prototype.hasOwnProperty.call(o, 'similarityPreference')) {
    const sp = o.similarityPreference;
    if (sp === null) {
      similarityPreference = null;
    } else {
      similarityPreference = pickMatchingCanonicalEnumMember<SimilarityPreference>(
        sp,
        SIMILARITY_PREFERENCE_PARSE_SET,
      );
    }
  }

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
    ...(similarityPreference !== undefined ? { similarityPreference } : {}),
  } as HolyGrailStructuredPreferencesPersisted;

  return Object.keys(merged).length === 0 ? undefined : merged;
}

/** Single entry point: Prisma JSON columns → `HolyGrailProfileMappingInput` for the canonical mapper. */
export function buildHolyGrailProfileMappingInputFromDbRow(args: {
  profileId: string;
  extractionV2: {
    interests_self: string[];
    interests: string[];
    lifestyleTraits: string[];
  } | null;
  holyGrailStructuredFacts: unknown;
  holyGrailStructuredPreferences: unknown;
  /** Self-domain `ProfileSignalSnapshot` row when present (HG ranking typed columns). */
  signalSelf?: ProfileSignalSelfRow | null;
  aboutMe?: string | null;
  aboutPartner?: string | null;
}): HolyGrailProfileMappingInput {
  const sf = parseHolyGrailStructuredFactsFromJson(args.holyGrailStructuredFacts);
  const sp = parseHolyGrailStructuredPreferencesFromJson(args.holyGrailStructuredPreferences);

  const baseRanking = buildHolyGrailRankingSignalsFromDbSelfRow(args.signalSelf ?? null);
  const pt = extractPersonalityTraitsFromFreeText({
    aboutMe: args.aboutMe,
    aboutPartner: args.aboutPartner,
  });
  const ls = extractLifestyleSignalsFromFreeText({
    aboutMe: args.aboutMe,
    aboutPartner: args.aboutPartner,
  });
  const interestV1 = extractInterestTagsV1FromFreeText({
    aboutMe: args.aboutMe,
    aboutPartner: args.aboutPartner,
  });
  const rankingSignals: MatchingRankingSignalsSnapshot = {
    ...baseRanking,
    ...(pt.self.tags.length > 0 ? { personalityTraitsSelf: [...pt.self.tags] } : {}),
    ...(pt.partner.tags.length > 0 ? { personalityTraitsPartner: [...pt.partner.tags] } : {}),
    ...(ls.self.tags.length > 0 ? { lifestyleSignalsSelf: [...ls.self.tags] } : {}),
    ...(ls.partner.tags.length > 0 ? { lifestyleSignalsPartner: [...ls.partner.tags] } : {}),
    ...(interestV1.self.tags.length > 0 ? { interestTagsSelf: [...interestV1.self.tags] } : {}),
    ...(interestV1.partner.tags.length > 0 ? { interestTagsPartner: [...interestV1.partner.tags] } : {}),
  };

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
    rankingSignals,
  };
}

/**
 * Prisma row fragment that includes HG post-eligibility ranking columns (self `signalSnapshots` with typed HG fields).
 * Use with the same select as `PrismaHolyGrailProfileSourceRepository`.
 */
export type HolyGrailRankingAwareDbRow = {
  readonly id: string;
  readonly aboutMe?: string;
  readonly aboutPartner?: string | null;
  readonly holyGrailStructuredFacts: unknown;
  readonly holyGrailStructuredPreferences: unknown;
  readonly extractionV2: {
    interests_self: string[];
    interests: string[];
    lifestyleTraits: string[];
  } | null;
  readonly signalSnapshots?: ProfileSignalSelfRow[];
};

export function buildHolyGrailProfileMappingInputFromRankingAwareDbRow(
  row: HolyGrailRankingAwareDbRow,
): HolyGrailProfileMappingInput {
  const selfSnap = row.signalSnapshots?.[0];
  return buildHolyGrailProfileMappingInputFromDbRow({
    profileId: row.id,
    extractionV2: row.extractionV2,
    holyGrailStructuredFacts: row.holyGrailStructuredFacts,
    holyGrailStructuredPreferences: row.holyGrailStructuredPreferences,
    signalSelf: selfSnap ?? null,
    aboutMe: row.aboutMe,
    aboutPartner: row.aboutPartner,
  });
}
