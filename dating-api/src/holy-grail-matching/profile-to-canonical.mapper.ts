import {
  AcceptedPartnerAlcohol,
  AcceptedPartnerGender,
  AcceptedPartnerSmoking,
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  ExerciseLevelSelf,
  GenderIdentity,
  LivingSituationSelf,
  MATCHING_CANONICAL_MODEL_VERSION,
  MinimumPartnerEducation,
  PartnerHasChildrenAcceptance,
  PartnerWantsChildrenRequirement,
  PoliticsSelf,
  ReligionSelf,
  RelationshipStatusSelf,
  SexualOrientationSelf,
  SIMILARITY_PREFERENCE_VALUES,
  SmokingFrequencySelf,
  type MatchingCanonicalModel,
  type MatchingFacts,
  type MatchingPreferences,
  type MatchingRankingSignalsSnapshot,
  type MatchingSearchOverrides,
  type SimilarityPreference,
  WantsChildrenSelf,
  WorkStudySituationSelf,
} from '../canonical/matching-canonical.types';
import type { HolyGrailProfileMappingInput } from './profile-sources.types';
import { INTEREST_TAG_SET } from './interest-tags-text.extract';
import { LIFESTYLE_SIGNAL_TAG_SET } from './lifestyle-signals-text.extract';
import { PERSONALITY_TRAIT_TAG_SET } from './personality-traits-text.extract';
import { matchingCanonicalEnumStringValues } from './holy-grail-canonical-enum';
import {
  assertHolyGrailCalendarDateYmd,
  assertHolyGrailDateOfBirthNotFuture,
  assertHolyGrailStructuredMapPartnerAgeInteger,
  HOLY_GRAIL_SEARCH_OVERRIDE_KEY_SET,
  HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_KEY_SET,
  HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_KEY_SET,
} from './holy-grail-structured-contract';

/** Top-level keys allowed on `HolyGrailProfileMappingInput` at runtime. */
const MAPPING_INPUT_KEYS = new Set<string>([
  'profileId',
  'extractionArrays',
  'structuredFacts',
  'structuredPreferences',
  'searchOverrides',
  'rankingSignals',
]);

const RANKING_SIGNALS_KEYS = new Set<string>([
  'dailyRhythm',
  'autonomyTogetherness',
  'conflictStyle',
  'lifestylePace',
  'interestsTop',
  'personalityTraitsSelf',
  'personalityTraitsPartner',
  'lifestyleSignalsSelf',
  'lifestyleSignalsPartner',
  'interestTagsSelf',
  'interestTagsPartner',
]);

const EXTRACTION_ARRAYS_KEYS = new Set<string>(['interests_self', 'interests', 'lifestyleTraits']);

const STRUCTURED_FACTS_KEYS = HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_KEY_SET;
const STRUCTURED_PREFERENCES_KEYS = HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_KEY_SET;
const SEARCH_OVERRIDE_KEYS = HOLY_GRAIL_SEARCH_OVERRIDE_KEY_SET;

const SIMILARITY_PREFERENCE_STRINGS = [...SIMILARITY_PREFERENCE_VALUES];

function assertPlainRecord(value: unknown, context: string): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`HolyGrail map: ${context} must be a plain object`);
  }
}

function assertNoExtraKeys(obj: Record<string, unknown>, allowed: ReadonlySet<string>, context: string): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) {
      throw new Error(`HolyGrail map: unexpected key ${JSON.stringify(k)} in ${context}`);
    }
  }
}

function validateMappingInputShape(input: HolyGrailProfileMappingInput): void {
  assertPlainRecord(input, 'map input');
  assertNoExtraKeys(input as Record<string, unknown>, MAPPING_INPUT_KEYS, 'map input');
}

function validateRankingSignalsSlice(rs: HolyGrailProfileMappingInput['rankingSignals']): void {
  if (rs === undefined) {
    return;
  }
  assertPlainRecord(rs as unknown as Record<string, unknown>, 'rankingSignals');
  assertNoExtraKeys(rs as unknown as Record<string, unknown>, RANKING_SIGNALS_KEYS, 'rankingSignals');
  const o = rs as unknown as Record<string, unknown>;
  const dr = o.dailyRhythm;
  const at = o.autonomyTogetherness;
  if (dr !== null && dr !== undefined && typeof dr !== 'string') {
    throw new Error('HolyGrail map: rankingSignals.dailyRhythm must be string or null');
  }
  if (at !== null && at !== undefined && typeof at !== 'string') {
    throw new Error('HolyGrail map: rankingSignals.autonomyTogetherness must be string or null');
  }
  const cs = o.conflictStyle;
  const lp = o.lifestylePace;
  if (cs !== null && cs !== undefined && (typeof cs !== 'number' || !Number.isFinite(cs))) {
    throw new Error('HolyGrail map: rankingSignals.conflictStyle must be a finite number or null');
  }
  if (lp !== null && lp !== undefined && (typeof lp !== 'number' || !Number.isFinite(lp))) {
    throw new Error('HolyGrail map: rankingSignals.lifestylePace must be a finite number or null');
  }
  const it = o.interestsTop;
  if (!Array.isArray(it)) {
    throw new Error('HolyGrail map: rankingSignals.interestsTop must be an array');
  }
  for (let i = 0; i < it.length; i++) {
    if (typeof it[i] !== 'string') {
      throw new Error(`HolyGrail map: rankingSignals.interestsTop[${i}] must be a string`);
    }
  }
  for (const key of ['personalityTraitsSelf', 'personalityTraitsPartner'] as const) {
    const arr = o[key];
    if (arr === undefined) {
      continue;
    }
    if (!Array.isArray(arr)) {
      throw new Error(`HolyGrail map: rankingSignals.${key} must be an array when provided`);
    }
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string' || !PERSONALITY_TRAIT_TAG_SET.has(arr[i])) {
        throw new Error(`HolyGrail map: rankingSignals.${key}[${i}] must be a canonical personality trait tag`);
      }
    }
  }
  for (const key of ['lifestyleSignalsSelf', 'lifestyleSignalsPartner'] as const) {
    const arr = o[key];
    if (arr === undefined) {
      continue;
    }
    if (!Array.isArray(arr)) {
      throw new Error(`HolyGrail map: rankingSignals.${key} must be an array when provided`);
    }
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string' || !LIFESTYLE_SIGNAL_TAG_SET.has(arr[i])) {
        throw new Error(`HolyGrail map: rankingSignals.${key}[${i}] must be a canonical lifestyle signal tag`);
      }
    }
  }
  for (const key of ['interestTagsSelf', 'interestTagsPartner'] as const) {
    const arr = o[key];
    if (arr === undefined) {
      continue;
    }
    if (!Array.isArray(arr)) {
      throw new Error(`HolyGrail map: rankingSignals.${key} must be an array when provided`);
    }
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string' || !INTEREST_TAG_SET.has(arr[i])) {
        throw new Error(`HolyGrail map: rankingSignals.${key}[${i}] must be a canonical interest tag`);
      }
    }
  }
}

function validateExtractionArraysSlice(ex: HolyGrailProfileMappingInput['extractionArrays']): void {
  if (ex === undefined || ex === null) {
    return;
  }
  assertPlainRecord(ex, 'extractionArrays');
  assertNoExtraKeys(ex as Record<string, unknown>, EXTRACTION_ARRAYS_KEYS, 'extractionArrays');
  const o = ex as Record<string, unknown>;
  for (const key of EXTRACTION_ARRAYS_KEYS) {
    const v = o[key];
    if (v === undefined) {
      continue;
    }
    if (!Array.isArray(v)) {
      throw new Error(`HolyGrail map: extractionArrays.${key} must be an array when provided`);
    }
    for (let i = 0; i < v.length; i++) {
      if (typeof v[i] !== 'string') {
        throw new Error(`HolyGrail map: extractionArrays.${key}[${i}] must be a string`);
      }
    }
  }
}

function validateStructuredFactsSlice(sf: HolyGrailProfileMappingInput['structuredFacts']): void {
  if (sf === undefined || sf === null) {
    return;
  }
  assertPlainRecord(sf, 'structuredFacts');
  assertNoExtraKeys(sf as Record<string, unknown>, STRUCTURED_FACTS_KEYS, 'structuredFacts');
}

function validateStructuredPreferencesSlice(
  sp: HolyGrailProfileMappingInput['structuredPreferences'],
): void {
  if (sp === undefined || sp === null) {
    return;
  }
  assertPlainRecord(sp, 'structuredPreferences');
  assertNoExtraKeys(sp as Record<string, unknown>, STRUCTURED_PREFERENCES_KEYS, 'structuredPreferences');
}

function assertInEnum(value: string, allowed: readonly string[], field: string): string {
  if (!allowed.includes(value)) {
    throw new Error(`HolyGrail map: invalid ${field}: ${JSON.stringify(value)} (not in enum allowlist)`);
  }
  return value;
}

/** Reject non-strings before enum check (runtime JSON safety). */
function assertStringInEnum(value: unknown, allowed: readonly string[], field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`HolyGrail map: ${field} must be a string enum value, got ${typeof value}`);
  }
  return assertInEnum(value, allowed, field);
}

function assertNonEmptyProfileId(id: unknown): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('HolyGrail map: profileId must be a non-empty string');
  }
  return id.trim();
}

function readStringArrayField(o: Record<string, unknown>, key: string): string[] {
  const v = o[key];
  if (v === undefined) {
    return [];
  }
  if (!Array.isArray(v)) {
    throw new Error(`HolyGrail map: extractionArrays.${key} must be an array when provided`);
  }
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] !== 'string') {
      throw new Error(`HolyGrail map: extractionArrays.${key}[${i}] must be a string`);
    }
  }
  return v as string[];
}

function normalizeInterestTag(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return s;
}

function buildInterestTags(input: HolyGrailProfileMappingInput): string[] | undefined {
  const ex = input.extractionArrays;
  if (!ex) {
    return undefined;
  }
  const o = ex as Record<string, unknown>;
  const a = readStringArrayField(o, 'interests_self');
  const b = readStringArrayField(o, 'interests');
  const c = readStringArrayField(o, 'lifestyleTraits');
  const ordered = [...a, ...b, ...c];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ordered) {
    const t = normalizeInterestTag(raw);
    if (t.length === 0) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length > 0 ? out : undefined;
}

function buildFacts(input: HolyGrailProfileMappingInput): MatchingFacts {
  const sf = input.structuredFacts;
  const facts: MatchingFacts = {};
  if (!sf) {
    const tags = buildInterestTags(input);
    if (tags) facts.interestTags = tags;
    return facts;
  }

  const g = matchingCanonicalEnumStringValues(GenderIdentity);
  const so = matchingCanonicalEnumStringValues(SexualOrientationSelf);
  const rs = matchingCanonicalEnumStringValues(RelationshipStatusSelf);
  const cs = matchingCanonicalEnumStringValues(ChildrenStatusSelf);
  const wc = matchingCanonicalEnumStringValues(WantsChildrenSelf);
  const sm = matchingCanonicalEnumStringValues(SmokingFrequencySelf);
  const al = matchingCanonicalEnumStringValues(AlcoholUseSelf);
  const ex = matchingCanonicalEnumStringValues(ExerciseLevelSelf);
  const rel = matchingCanonicalEnumStringValues(ReligionSelf);
  const pol = matchingCanonicalEnumStringValues(PoliticsSelf);
  const ed = matchingCanonicalEnumStringValues(EducationLevelSelf);
  const liv = matchingCanonicalEnumStringValues(LivingSituationSelf);
  const ws = matchingCanonicalEnumStringValues(WorkStudySituationSelf);

  if (sf.genderIdentity !== undefined) {
    facts.genderIdentity = assertStringInEnum(sf.genderIdentity, g, 'structuredFacts.genderIdentity') as GenderIdentity;
  }
  if (sf.sexualOrientation !== undefined) {
    facts.sexualOrientation = assertStringInEnum(
      sf.sexualOrientation,
      so,
      'structuredFacts.sexualOrientation',
    ) as SexualOrientationSelf;
  }
  if (sf.relationshipStatus !== undefined) {
    facts.relationshipStatus = assertStringInEnum(
      sf.relationshipStatus,
      rs,
      'structuredFacts.relationshipStatus',
    ) as RelationshipStatusSelf;
  }
  if (sf.childrenStatus !== undefined) {
    facts.childrenStatus = assertStringInEnum(
      sf.childrenStatus,
      cs,
      'structuredFacts.childrenStatus',
    ) as ChildrenStatusSelf;
  }
  if (sf.wantsChildren !== undefined) {
    facts.wantsChildren = assertStringInEnum(sf.wantsChildren, wc, 'structuredFacts.wantsChildren') as WantsChildrenSelf;
  }
  if (sf.smoking !== undefined) {
    facts.smoking = assertStringInEnum(sf.smoking, sm, 'structuredFacts.smoking') as SmokingFrequencySelf;
  }
  if (sf.alcoholUse !== undefined) {
    facts.alcoholUse = assertStringInEnum(sf.alcoholUse, al, 'structuredFacts.alcoholUse') as AlcoholUseSelf;
  }
  if (sf.exerciseLevel !== undefined) {
    facts.exerciseLevel = assertStringInEnum(
      sf.exerciseLevel,
      ex,
      'structuredFacts.exerciseLevel',
    ) as ExerciseLevelSelf;
  }
  if (sf.religion !== undefined) {
    facts.religion = assertStringInEnum(sf.religion, rel, 'structuredFacts.religion') as ReligionSelf;
  }
  if (sf.politics !== undefined) {
    facts.politics = assertStringInEnum(sf.politics, pol, 'structuredFacts.politics') as PoliticsSelf;
  }
  if (sf.education !== undefined) {
    facts.education = assertStringInEnum(sf.education, ed, 'structuredFacts.education') as EducationLevelSelf;
  }
  if (sf.livingSituation !== undefined) {
    facts.livingSituation = assertStringInEnum(
      sf.livingSituation,
      liv,
      'structuredFacts.livingSituation',
    ) as LivingSituationSelf;
  }
  if (sf.workStudySituation !== undefined) {
    facts.workStudySituation = assertStringInEnum(
      sf.workStudySituation,
      ws,
      'structuredFacts.workStudySituation',
    ) as WorkStudySituationSelf;
  }
  if (sf.dateOfBirth !== undefined) {
    if (typeof sf.dateOfBirth !== 'string') {
      throw new Error('HolyGrail map: structuredFacts.dateOfBirth must be a string');
    }
    const ymd = assertHolyGrailCalendarDateYmd(sf.dateOfBirth);
    assertHolyGrailDateOfBirthNotFuture(ymd);
    facts.dateOfBirth = ymd;
  }
  if (sf.primaryLocationLabel !== undefined) {
    if (typeof sf.primaryLocationLabel !== 'string') {
      throw new Error('HolyGrail map: structuredFacts.primaryLocationLabel must be a string');
    }
    const pl = sf.primaryLocationLabel.trim();
    if (pl.length === 0) {
      throw new Error('HolyGrail map: structuredFacts.primaryLocationLabel must be non-empty when provided');
    }
    facts.primaryLocationLabel = pl;
  }

  const tags = buildInterestTags(input);
  if (tags) facts.interestTags = tags;

  return facts;
}

function assertPositiveFiniteKm(n: unknown, field: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    throw new Error(`HolyGrail map: ${field} must be a finite number > 0`);
  }
  return n;
}

function dedupeReligions(list: readonly string[], ctx: string): ReligionSelf[] {
  const allowed = new Set(matchingCanonicalEnumStringValues(ReligionSelf));
  const out: ReligionSelf[] = [];
  const seen = new Set<string>();
  for (const x of list) {
    if (typeof x !== 'string') {
      throw new Error(`HolyGrail map: ${ctx} must contain only strings`);
    }
    if (!allowed.has(x)) {
      throw new Error(`HolyGrail map: invalid ${ctx} element ${JSON.stringify(x)} (not in ReligionSelf enum)`);
    }
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x as ReligionSelf);
  }
  return out;
}

function buildPreferences(sp: HolyGrailProfileMappingInput['structuredPreferences']): MatchingPreferences {
  const p = sp ?? {};
  const out: MatchingPreferences = {};

  if (p.acceptedPartnerGenders !== undefined) {
    const list = p.acceptedPartnerGenders;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error(
        'HolyGrail map: structuredPreferences.acceptedPartnerGenders must be a non-empty array when provided',
      );
    }
    const allowed = new Set(matchingCanonicalEnumStringValues(AcceptedPartnerGender));
    out.acceptedPartnerGenders = list.map((g, i) => {
      if (typeof g !== 'string' || !allowed.has(g)) {
        throw new Error(
          `HolyGrail map: invalid structuredPreferences.acceptedPartnerGenders[${i}]: ${JSON.stringify(g)} (not in enum)`,
        );
      }
      return g as AcceptedPartnerGender;
    });
  }

  if (p.partnerAgeMin !== undefined) {
    out.partnerAgeMin = assertHolyGrailStructuredMapPartnerAgeInteger(
      p.partnerAgeMin,
      'structuredPreferences.partnerAgeMin',
    );
  }
  if (p.partnerAgeMax !== undefined) {
    out.partnerAgeMax = assertHolyGrailStructuredMapPartnerAgeInteger(
      p.partnerAgeMax,
      'structuredPreferences.partnerAgeMax',
    );
  }
  if (
    out.partnerAgeMin !== undefined &&
    out.partnerAgeMax !== undefined &&
    out.partnerAgeMin > out.partnerAgeMax
  ) {
    throw new Error('HolyGrail map: partnerAgeMin must be <= partnerAgeMax');
  }

  if (p.minimumPartnerEducation !== undefined) {
    out.minimumPartnerEducation = assertStringInEnum(
      p.minimumPartnerEducation,
      matchingCanonicalEnumStringValues(MinimumPartnerEducation),
      'structuredPreferences.minimumPartnerEducation',
    ) as MinimumPartnerEducation;
  }

  if (p.acceptedPartnerSmoking !== undefined) {
    out.acceptedPartnerSmoking = assertStringInEnum(
      p.acceptedPartnerSmoking,
      matchingCanonicalEnumStringValues(AcceptedPartnerSmoking),
      'structuredPreferences.acceptedPartnerSmoking',
    ) as AcceptedPartnerSmoking;
  }

  if (p.acceptedPartnerAlcohol !== undefined) {
    out.acceptedPartnerAlcohol = assertStringInEnum(
      p.acceptedPartnerAlcohol,
      matchingCanonicalEnumStringValues(AcceptedPartnerAlcohol),
      'structuredPreferences.acceptedPartnerAlcohol',
    ) as AcceptedPartnerAlcohol;
  }

  if (p.partnerWantsChildren !== undefined) {
    out.partnerWantsChildren = assertStringInEnum(
      p.partnerWantsChildren,
      matchingCanonicalEnumStringValues(PartnerWantsChildrenRequirement),
      'structuredPreferences.partnerWantsChildren',
    ) as PartnerWantsChildrenRequirement;
  }

  if (p.partnerHasChildren !== undefined) {
    out.partnerHasChildren = assertStringInEnum(
      p.partnerHasChildren,
      matchingCanonicalEnumStringValues(PartnerHasChildrenAcceptance),
      'structuredPreferences.partnerHasChildren',
    ) as PartnerHasChildrenAcceptance;
  }

  if (p.acceptedPartnerReligions !== undefined) {
    if (!Array.isArray(p.acceptedPartnerReligions)) {
      throw new Error(
        'HolyGrail map: structuredPreferences.acceptedPartnerReligions must be an array when provided',
      );
    }
    const religions = dedupeReligions(
      p.acceptedPartnerReligions,
      'structuredPreferences.acceptedPartnerReligions',
    );
    if (religions.length > 0) {
      out.acceptedPartnerReligions = religions;
    }
  }

  if (p.maxDistanceKm !== undefined) {
    out.maxDistanceKm = assertPositiveFiniteKm(p.maxDistanceKm, 'structuredPreferences.maxDistanceKm');
  }

  if (p.similarityPreference !== undefined) {
    if (p.similarityPreference === null) {
      out.similarityPreference = null;
    } else {
      out.similarityPreference = assertStringInEnum(
        p.similarityPreference,
        SIMILARITY_PREFERENCE_STRINGS,
        'structuredPreferences.similarityPreference',
      ) as SimilarityPreference;
    }
  }

  return out;
}

function assertIsoInstant(s: string, field: string): string {
  const t = Date.parse(s);
  if (!Number.isFinite(t)) {
    throw new Error(`HolyGrail map: ${field} must be a valid ISO-8601 instant string`);
  }
  return new Date(t).toISOString();
}

function parseSearchOverrides(raw: unknown): MatchingSearchOverrides {
  if (raw === undefined || raw === null) {
    return {};
  }
  assertPlainRecord(raw, 'searchOverrides');
  const o = raw as Record<string, unknown>;
  assertNoExtraKeys(o, SEARCH_OVERRIDE_KEYS, 'searchOverrides');

  const out: MatchingSearchOverrides = {};

  if (o.acceptedPartnerGenders !== undefined) {
    const list = o.acceptedPartnerGenders;
    if (!Array.isArray(list) || list.length === 0) {
      throw new Error('HolyGrail map: searchOverrides.acceptedPartnerGenders must be a non-empty array when provided');
    }
    const allowed = new Set(matchingCanonicalEnumStringValues(AcceptedPartnerGender));
    out.acceptedPartnerGenders = list.map((g, i) => {
      if (typeof g !== 'string' || !allowed.has(g)) {
        throw new Error(
          `HolyGrail map: invalid searchOverrides.acceptedPartnerGenders[${i}]: ${JSON.stringify(g)} (not in enum)`,
        );
      }
      return g as AcceptedPartnerGender;
    });
  }
  if (o.partnerAgeMin !== undefined) {
    out.partnerAgeMin = assertHolyGrailStructuredMapPartnerAgeInteger(
      o.partnerAgeMin,
      'searchOverrides.partnerAgeMin',
    );
  }
  if (o.partnerAgeMax !== undefined) {
    out.partnerAgeMax = assertHolyGrailStructuredMapPartnerAgeInteger(
      o.partnerAgeMax,
      'searchOverrides.partnerAgeMax',
    );
  }
  if (out.partnerAgeMin !== undefined && out.partnerAgeMax !== undefined && out.partnerAgeMin > out.partnerAgeMax) {
    throw new Error('HolyGrail map: searchOverrides.partnerAgeMin must be <= partnerAgeMax');
  }
  if (o.minimumPartnerEducation !== undefined) {
    out.minimumPartnerEducation = assertStringInEnum(
      o.minimumPartnerEducation,
      matchingCanonicalEnumStringValues(MinimumPartnerEducation),
      'searchOverrides.minimumPartnerEducation',
    ) as MinimumPartnerEducation;
  }
  if (o.acceptedPartnerSmoking !== undefined) {
    out.acceptedPartnerSmoking = assertStringInEnum(
      o.acceptedPartnerSmoking,
      matchingCanonicalEnumStringValues(AcceptedPartnerSmoking),
      'searchOverrides.acceptedPartnerSmoking',
    ) as AcceptedPartnerSmoking;
  }
  if (o.acceptedPartnerAlcohol !== undefined) {
    out.acceptedPartnerAlcohol = assertStringInEnum(
      o.acceptedPartnerAlcohol,
      matchingCanonicalEnumStringValues(AcceptedPartnerAlcohol),
      'searchOverrides.acceptedPartnerAlcohol',
    ) as AcceptedPartnerAlcohol;
  }
  if (o.partnerWantsChildren !== undefined) {
    out.partnerWantsChildren = assertStringInEnum(
      o.partnerWantsChildren,
      matchingCanonicalEnumStringValues(PartnerWantsChildrenRequirement),
      'searchOverrides.partnerWantsChildren',
    ) as PartnerWantsChildrenRequirement;
  }
  if (o.partnerHasChildren !== undefined) {
    out.partnerHasChildren = assertStringInEnum(
      o.partnerHasChildren,
      matchingCanonicalEnumStringValues(PartnerHasChildrenAcceptance),
      'searchOverrides.partnerHasChildren',
    ) as PartnerHasChildrenAcceptance;
  }
  if (o.acceptedPartnerReligions !== undefined) {
    if (!Array.isArray(o.acceptedPartnerReligions)) {
      throw new Error('HolyGrail map: searchOverrides.acceptedPartnerReligions must be an array');
    }
    out.acceptedPartnerReligions = dedupeReligions(
      o.acceptedPartnerReligions as string[],
      'searchOverrides.acceptedPartnerReligions',
    );
  }
  if (o.maxDistanceKm !== undefined) {
    out.maxDistanceKm = assertPositiveFiniteKm(o.maxDistanceKm, 'searchOverrides.maxDistanceKm');
  }
  if (o.similarityPreference !== undefined) {
    if (o.similarityPreference === null) {
      out.similarityPreference = null;
    } else {
      out.similarityPreference = assertStringInEnum(
        o.similarityPreference,
        SIMILARITY_PREFERENCE_STRINGS,
        'searchOverrides.similarityPreference',
      ) as SimilarityPreference;
    }
  }
  if (o.validUntil !== undefined) {
    if (typeof o.validUntil !== 'string' || o.validUntil.trim().length === 0) {
      throw new Error('HolyGrail map: searchOverrides.validUntil must be a non-empty string');
    }
    out.validUntil = assertIsoInstant(o.validUntil.trim(), 'searchOverrides.validUntil');
  }

  return out;
}

/**
 * Layer 2 — Canonical mapping: structured DTO only → `MatchingCanonicalModel` v1.
 * Strict runtime validation: unknown keys rejected; enums checked against `Object.values` allowlists.
 * Spec: docs/HOLY_GRAIL_MATCHING.md Step 4. Deterministic; no raw text; no LLM.
 */
export function mapProfileSourceToMatchingCanonical(input: HolyGrailProfileMappingInput): MatchingCanonicalModel {
  validateMappingInputShape(input);
  validateExtractionArraysSlice(input.extractionArrays);
  validateStructuredFactsSlice(input.structuredFacts);
  validateStructuredPreferencesSlice(input.structuredPreferences);
  validateRankingSignalsSlice(input.rankingSignals);

  const profileId = assertNonEmptyProfileId(input.profileId);
  const base: MatchingCanonicalModel = {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: buildFacts(input),
    preferences: buildPreferences(input.structuredPreferences),
    searchOverrides: parseSearchOverrides(input.searchOverrides),
  };
  if (input.rankingSignals !== undefined) {
    const rs = input.rankingSignals as MatchingRankingSignalsSnapshot;
    return {
      ...base,
      rankingSignals: {
        dailyRhythm: rs.dailyRhythm,
        autonomyTogetherness: rs.autonomyTogetherness,
        conflictStyle: rs.conflictStyle,
        lifestylePace: rs.lifestylePace,
        interestsTop: [...rs.interestsTop],
        ...(rs.personalityTraitsSelf !== undefined && rs.personalityTraitsSelf.length > 0
          ? { personalityTraitsSelf: [...rs.personalityTraitsSelf] }
          : {}),
        ...(rs.personalityTraitsPartner !== undefined && rs.personalityTraitsPartner.length > 0
          ? { personalityTraitsPartner: [...rs.personalityTraitsPartner] }
          : {}),
        ...(rs.lifestyleSignalsSelf !== undefined && rs.lifestyleSignalsSelf.length > 0
          ? { lifestyleSignalsSelf: [...rs.lifestyleSignalsSelf] }
          : {}),
        ...(rs.lifestyleSignalsPartner !== undefined && rs.lifestyleSignalsPartner.length > 0
          ? { lifestyleSignalsPartner: [...rs.lifestyleSignalsPartner] }
          : {}),
        ...(rs.interestTagsSelf !== undefined && rs.interestTagsSelf.length > 0
          ? { interestTagsSelf: [...rs.interestTagsSelf] }
          : {}),
        ...(rs.interestTagsPartner !== undefined && rs.interestTagsPartner.length > 0
          ? { interestTagsPartner: [...rs.interestTagsPartner] }
          : {}),
      },
    };
  }
  return base;
}
