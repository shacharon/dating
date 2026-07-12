/**
 * Deterministic parse of persisted JSON blobs → `HolyGrailProfileMappingInput` slices.
 * Facts JSON: same key allow-lists and value rules as merge write (unknown keys → error;
 * invalid values for present keys → error). Prefs JSON: unknown / Sprint-15-removed keys are
 * **ignored** so leftover DB blobs cannot re-enter canonical prefs. `null` / missing column →
 * no slice (`undefined`). Empty `{}` → `undefined`.
 * Mapper-only **facts** keys (see `HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_ONLY_KEYS`) are not stored in facts JSON and
 * must not appear there (same as merge rejects them on write).
 *
 * **Canonical DB → matching path:** `buildHolyGrailProfileMappingInputFromDbRow` (this module) →
 * `mapProfileSourceToMatchingCanonical`. Do not add a second parser for `holyGrailStructured*` columns.
 * HG ranking five signals are read from `ProfileSignalSnapshot` self typed columns (`HOLY_GRAIL_RANKING_SIGNAL_SELF_SELECT`).
 * Canonical **personality (v1+v2 trait tags)**, **lifestyle (v1+v2 tags)**, and **interest tags (v1+v2)** are merged from `aboutMe` / `aboutPartner` (deterministic extractors).
 */

import {
  AcceptedPartnerGender,
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  GenderIdentity,
  ReligionSelf,
  SmokingFrequencySelf,
  WantsChildrenSelf,
  type MatchingRankingSignalsSnapshot,
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
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../dealbreaker-signals-text.extract';
import { selfFactHintsToPolarityMap } from '../dealbreaker-eligibility';
import {
  matchingCanonicalEnumMemberSet,
  pickMatchingCanonicalEnumMember,
} from '../holy-grail-canonical-enum';
import {
  assertHolyGrailStructuredMapPartnerAgeInteger,
  HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS,
  HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEY_SET,
  HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS,
  isHolyGrailDobYmdString,
} from '../holy-grail-structured-contract';

/** Compile-time guard: extend parser when `HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS` grows. */
const _holyGrailDbJsonFactsCoverage: Record<
  (typeof HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS)[number],
  true
> = {
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
  maxDistanceKm: true,
};

void _holyGrailDbJsonFactsCoverage;
void _holyGrailDbJsonPrefsCoverage;

function asPlainObject(v: unknown): Record<string, unknown> | null {
  if (v === null || typeof v !== 'object' || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

/**
 * Parses `MatchmakingProfile.holyGrailStructuredFacts` JSON.
 * Supported keys: `HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS`.
 */
export function parseHolyGrailStructuredFactsFromJson(
  raw: unknown,
): HolyGrailStructuredFactsPersisted | undefined {
  if (raw === null || raw === undefined) return undefined;
  const o = asPlainObject(raw);
  if (!o) {
    throw new Error('HolyGrail structured facts JSON: expected a plain object');
  }
  if (Object.keys(o).length === 0) return undefined;

  for (const k of Object.keys(o)) {
    if (!HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEY_SET.has(k)) {
      throw new Error(
        `HolyGrail structured facts JSON: unknown key ${JSON.stringify(k)}`,
      );
    }
  }

  const merged: HolyGrailStructuredFactsPersisted = {};

  if (Object.prototype.hasOwnProperty.call(o, 'genderIdentity')) {
    const genderIdentity = pickMatchingCanonicalEnumMember<GenderIdentity>(
      o.genderIdentity,
      matchingCanonicalEnumMemberSet(GenderIdentity),
    );
    if (genderIdentity === undefined) {
      throw new Error(
        `HolyGrail structured facts JSON: invalid genderIdentity ${JSON.stringify(o.genderIdentity)}`,
      );
    }
    merged.genderIdentity = genderIdentity;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'dateOfBirth')) {
    if (
      typeof o.dateOfBirth !== 'string' ||
      !isHolyGrailDobYmdString(o.dateOfBirth)
    ) {
      throw new Error(
        `HolyGrail structured facts JSON: invalid dateOfBirth ${JSON.stringify(o.dateOfBirth)}`,
      );
    }
    merged.dateOfBirth = o.dateOfBirth;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'childrenStatus')) {
    const childrenStatus = pickMatchingCanonicalEnumMember(
      o.childrenStatus,
      matchingCanonicalEnumMemberSet(ChildrenStatusSelf),
    ) as ChildrenStatusSelf | undefined;
    if (childrenStatus === undefined) {
      throw new Error(
        `HolyGrail structured facts JSON: invalid childrenStatus ${JSON.stringify(o.childrenStatus)}`,
      );
    }
    merged.childrenStatus = childrenStatus;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'wantsChildren')) {
    const wantsChildren = pickMatchingCanonicalEnumMember(
      o.wantsChildren,
      matchingCanonicalEnumMemberSet(WantsChildrenSelf),
    ) as WantsChildrenSelf | undefined;
    if (wantsChildren === undefined) {
      throw new Error(
        `HolyGrail structured facts JSON: invalid wantsChildren ${JSON.stringify(o.wantsChildren)}`,
      );
    }
    merged.wantsChildren = wantsChildren;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'smoking')) {
    const smoking = pickMatchingCanonicalEnumMember(
      o.smoking,
      matchingCanonicalEnumMemberSet(SmokingFrequencySelf),
    ) as SmokingFrequencySelf | undefined;
    if (smoking === undefined) {
      throw new Error(
        `HolyGrail structured facts JSON: invalid smoking ${JSON.stringify(o.smoking)}`,
      );
    }
    merged.smoking = smoking;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'alcoholUse')) {
    const alcoholUse = pickMatchingCanonicalEnumMember(
      o.alcoholUse,
      matchingCanonicalEnumMemberSet(AlcoholUseSelf),
    ) as AlcoholUseSelf | undefined;
    if (alcoholUse === undefined) {
      throw new Error(
        `HolyGrail structured facts JSON: invalid alcoholUse ${JSON.stringify(o.alcoholUse)}`,
      );
    }
    merged.alcoholUse = alcoholUse;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'education')) {
    const education = pickMatchingCanonicalEnumMember(
      o.education,
      matchingCanonicalEnumMemberSet(EducationLevelSelf),
    ) as EducationLevelSelf | undefined;
    if (education === undefined) {
      throw new Error(
        `HolyGrail structured facts JSON: invalid education ${JSON.stringify(o.education)}`,
      );
    }
    merged.education = education;
  }

  if (Object.prototype.hasOwnProperty.call(o, 'religion')) {
    const religion = pickMatchingCanonicalEnumMember(
      o.religion,
      matchingCanonicalEnumMemberSet(ReligionSelf),
    ) as ReligionSelf | undefined;
    if (religion === undefined) {
      throw new Error(
        `HolyGrail structured facts JSON: invalid religion ${JSON.stringify(o.religion)}`,
      );
    }
    merged.religion = religion;
  }

  return Object.keys(merged).length === 0 ? undefined : merged;
}

function parseAcceptedPartnerGendersDbJson(
  v: unknown,
): AcceptedPartnerGender[] {
  if (!Array.isArray(v) || v.length === 0) {
    throw new Error(
      'HolyGrail structured preferences JSON: acceptedPartnerGenders must be a non-empty array when set',
    );
  }
  const allowed = matchingCanonicalEnumMemberSet(AcceptedPartnerGender);
  const out: AcceptedPartnerGender[] = [];
  for (let i = 0; i < v.length; i++) {
    const s = v[i];
    if (typeof s !== 'string' || !allowed.has(s)) {
      throw new Error(
        `HolyGrail structured preferences JSON: invalid acceptedPartnerGenders[${i}]: ${JSON.stringify(s)}`,
      );
    }
    out.push(s as AcceptedPartnerGender);
  }
  return out;
}

function parseMaxDistanceKmDbJson(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
    throw new Error(
      `HolyGrail structured preferences JSON: invalid maxDistanceKm ${JSON.stringify(v)}`,
    );
  }
  return v;
}

/**
 * Parses `MatchmakingProfile.holyGrailStructuredPreferences` JSON.
 * Supported keys: `HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS`.
 * Stale removed preference keys (Sprint 15) are ignored so leftover JSON cannot re-enter canonical prefs.
 */
export function parseHolyGrailStructuredPreferencesFromJson(
  raw: unknown,
): HolyGrailStructuredPreferencesPersisted | undefined {
  if (raw === null || raw === undefined) return undefined;
  const o = asPlainObject(raw);
  if (!o) {
    throw new Error(
      'HolyGrail structured preferences JSON: expected a plain object',
    );
  }
  if (Object.keys(o).length === 0) return undefined;

  let partnerAgeMin: number | undefined;
  let partnerAgeMax: number | undefined;
  if (Object.prototype.hasOwnProperty.call(o, 'partnerAgeMin')) {
    partnerAgeMin = assertHolyGrailStructuredMapPartnerAgeInteger(
      o.partnerAgeMin,
      'holyGrailStructuredPreferences.partnerAgeMin',
    );
  }
  if (Object.prototype.hasOwnProperty.call(o, 'partnerAgeMax')) {
    partnerAgeMax = assertHolyGrailStructuredMapPartnerAgeInteger(
      o.partnerAgeMax,
      'holyGrailStructuredPreferences.partnerAgeMax',
    );
  }
  if (
    partnerAgeMin !== undefined &&
    partnerAgeMax !== undefined &&
    partnerAgeMin > partnerAgeMax
  ) {
    throw new Error(
      'HolyGrail structured preferences JSON: partnerAgeMin must be <= partnerAgeMax',
    );
  }

  let acceptedPartnerGenders: AcceptedPartnerGender[] | undefined;
  if (Object.prototype.hasOwnProperty.call(o, 'acceptedPartnerGenders')) {
    acceptedPartnerGenders = parseAcceptedPartnerGendersDbJson(
      o.acceptedPartnerGenders,
    );
  }

  let maxDistanceKm: number | undefined;
  if (Object.prototype.hasOwnProperty.call(o, 'maxDistanceKm')) {
    maxDistanceKm = parseMaxDistanceKmDbJson(o.maxDistanceKm);
  }

  const merged = {
    ...(acceptedPartnerGenders !== undefined ? { acceptedPartnerGenders } : {}),
    ...(partnerAgeMin !== undefined ? { partnerAgeMin } : {}),
    ...(partnerAgeMax !== undefined ? { partnerAgeMax } : {}),
    ...(maxDistanceKm !== undefined ? { maxDistanceKm } : {}),
  } as HolyGrailStructuredPreferencesPersisted;

  return Object.keys(merged).length === 0 ? undefined : merged;
}

/** Single entry point: Prisma JSON columns → `HolyGrailProfileMappingInput` for the canonical mapper. */
export function buildHolyGrailProfileMappingInputFromDbRow(args: {
  profileId: string;
  extractionV2?: {
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
  aboutRelationship?: string | null;
}): HolyGrailProfileMappingInput {
  const sf = parseHolyGrailStructuredFactsFromJson(
    args.holyGrailStructuredFacts,
  );
  const sp = parseHolyGrailStructuredPreferencesFromJson(
    args.holyGrailStructuredPreferences,
  );

  const baseRanking = buildHolyGrailRankingSignalsFromDbSelfRow(
    args.signalSelf ?? null,
  );
  const textFields = {
    aboutMe: args.aboutMe,
    aboutPartner: args.aboutPartner,
    aboutRelationship: args.aboutRelationship,
  };
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
  const dealbreakerExt = extractDealbreakerSignalsFromFreeText(textFields);
  const selfHints = extractSelfFactHintsFromFreeText(textFields);
  const dealbreakerSelfFacts = selfFactHintsToPolarityMap(selfHints);

  const rankingSignals: MatchingRankingSignalsSnapshot = {
    ...baseRanking,
    ...(pt.self.tags.length > 0
      ? { personalityTraitsSelf: [...pt.self.tags] }
      : {}),
    ...(pt.partner.tags.length > 0
      ? { personalityTraitsPartner: [...pt.partner.tags] }
      : {}),
    ...(ls.self.tags.length > 0
      ? { lifestyleSignalsSelf: [...ls.self.tags] }
      : {}),
    ...(ls.partner.tags.length > 0
      ? { lifestyleSignalsPartner: [...ls.partner.tags] }
      : {}),
    ...(interestV1.self.tags.length > 0
      ? { interestTagsSelf: [...interestV1.self.tags] }
      : {}),
    ...(interestV1.partner.tags.length > 0
      ? { interestTagsPartner: [...interestV1.partner.tags] }
      : {}),
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
    ...(dealbreakerExt.signals.length > 0
      ? { dealbreakerSignals: [...dealbreakerExt.signals] }
      : {}),
    ...(Object.keys(dealbreakerSelfFacts).length > 0
      ? { dealbreakerSelfFacts }
      : {}),
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
  readonly aboutRelationship?: string | null;
  readonly holyGrailStructuredFacts: unknown;
  readonly holyGrailStructuredPreferences: unknown;
  readonly signalSnapshots?: ProfileSignalSelfRow[];
};

export function buildHolyGrailProfileMappingInputFromRankingAwareDbRow(
  row: HolyGrailRankingAwareDbRow,
): HolyGrailProfileMappingInput {
  const selfSnap = row.signalSnapshots?.[0];
  return buildHolyGrailProfileMappingInputFromDbRow({
    profileId: row.id,
    extractionV2: null,
    holyGrailStructuredFacts: row.holyGrailStructuredFacts,
    holyGrailStructuredPreferences: row.holyGrailStructuredPreferences,
    signalSelf: selfSnap ?? null,
    aboutMe: row.aboutMe,
    aboutPartner: row.aboutPartner,
    aboutRelationship: row.aboutRelationship,
  });
}
