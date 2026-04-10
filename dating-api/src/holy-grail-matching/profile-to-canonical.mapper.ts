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
  SmokingFrequencySelf,
  type MatchingCanonicalModel,
  type MatchingFacts,
  type MatchingPreferences,
  type MatchingSearchOverrides,
  WantsChildrenSelf,
  WorkStudySituationSelf,
} from '../canonical/matching-canonical.types';
import type { HolyGrailProfileMappingInput } from './profile-sources.types';

/** Top-level keys allowed on `HolyGrailProfileMappingInput` at runtime. */
const MAPPING_INPUT_KEYS = new Set<string>([
  'profileId',
  'extractionArrays',
  'structuredFacts',
  'structuredPreferences',
  'searchOverrides',
]);

const EXTRACTION_ARRAYS_KEYS = new Set<string>(['interests_self', 'interests', 'lifestyleTraits']);

const STRUCTURED_FACTS_KEYS = new Set<string>([
  'genderIdentity',
  'sexualOrientation',
  'relationshipStatus',
  'childrenStatus',
  'wantsChildren',
  'smoking',
  'alcoholUse',
  'exerciseLevel',
  'religion',
  'politics',
  'education',
  'livingSituation',
  'workStudySituation',
  'dateOfBirth',
  'primaryLocationLabel',
]);

const STRUCTURED_PREFERENCES_KEYS = new Set<string>([
  'acceptedPartnerGenders',
  'partnerAgeMin',
  'partnerAgeMax',
  'minimumPartnerEducation',
  'acceptedPartnerSmoking',
  'acceptedPartnerAlcohol',
  'partnerWantsChildren',
  'partnerHasChildren',
  'acceptedPartnerReligions',
  'maxDistanceKm',
]);

const SEARCH_OVERRIDE_KEYS = new Set<string>([
  'acceptedPartnerGenders',
  'partnerAgeMin',
  'partnerAgeMax',
  'minimumPartnerEducation',
  'acceptedPartnerSmoking',
  'acceptedPartnerAlcohol',
  'partnerWantsChildren',
  'partnerHasChildren',
  'acceptedPartnerReligions',
  'maxDistanceKm',
  'validUntil',
]);

function enumValues<E extends Record<string, string>>(e: E): string[] {
  return Object.values(e).filter((v) => typeof v === 'string');
}

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

const DOB_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function assertDateYmd(s: string): string {
  const m = DOB_RE.exec(s);
  if (!m) {
    throw new Error(`HolyGrail map: dateOfBirth must be YYYY-MM-DD, got ${JSON.stringify(s)}`);
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`HolyGrail map: invalid calendar date dateOfBirth ${JSON.stringify(s)}`);
  }
  return s;
}

function assertDateOfBirthNotFuture(ymd: string): void {
  const m = DOB_RE.exec(ymd);
  if (!m) {
    return;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dobUtc = Date.UTC(y, mo - 1, d);
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (dobUtc > todayUtc) {
    throw new Error(`HolyGrail map: dateOfBirth must not be in the future, got ${JSON.stringify(ymd)}`);
  }
}

function buildFacts(input: HolyGrailProfileMappingInput): MatchingFacts {
  const sf = input.structuredFacts;
  const facts: MatchingFacts = {};
  if (!sf) {
    const tags = buildInterestTags(input);
    if (tags) facts.interestTags = tags;
    return facts;
  }

  const g = enumValues(GenderIdentity);
  const so = enumValues(SexualOrientationSelf);
  const rs = enumValues(RelationshipStatusSelf);
  const cs = enumValues(ChildrenStatusSelf);
  const wc = enumValues(WantsChildrenSelf);
  const sm = enumValues(SmokingFrequencySelf);
  const al = enumValues(AlcoholUseSelf);
  const ex = enumValues(ExerciseLevelSelf);
  const rel = enumValues(ReligionSelf);
  const pol = enumValues(PoliticsSelf);
  const ed = enumValues(EducationLevelSelf);
  const liv = enumValues(LivingSituationSelf);
  const ws = enumValues(WorkStudySituationSelf);

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
    const ymd = assertDateYmd(sf.dateOfBirth);
    assertDateOfBirthNotFuture(ymd);
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

function assertIntegerAge(n: unknown, field: string): number {
  if (typeof n !== 'number' || !Number.isInteger(n)) {
    throw new Error(`HolyGrail map: ${field} must be an integer`);
  }
  if (n < 18 || n > 120) {
    throw new Error(`HolyGrail map: ${field} must be in [18, 120], got ${n}`);
  }
  return n;
}

function assertPositiveFiniteKm(n: unknown, field: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    throw new Error(`HolyGrail map: ${field} must be a finite number > 0`);
  }
  return n;
}

function dedupeReligions(list: readonly string[], ctx: string): ReligionSelf[] {
  const allowed = new Set(enumValues(ReligionSelf));
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
    const allowed = new Set(enumValues(AcceptedPartnerGender));
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
    out.partnerAgeMin = assertIntegerAge(p.partnerAgeMin, 'structuredPreferences.partnerAgeMin');
  }
  if (p.partnerAgeMax !== undefined) {
    out.partnerAgeMax = assertIntegerAge(p.partnerAgeMax, 'structuredPreferences.partnerAgeMax');
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
      enumValues(MinimumPartnerEducation),
      'structuredPreferences.minimumPartnerEducation',
    ) as MinimumPartnerEducation;
  }

  if (p.acceptedPartnerSmoking !== undefined) {
    out.acceptedPartnerSmoking = assertStringInEnum(
      p.acceptedPartnerSmoking,
      enumValues(AcceptedPartnerSmoking),
      'structuredPreferences.acceptedPartnerSmoking',
    ) as AcceptedPartnerSmoking;
  }

  if (p.acceptedPartnerAlcohol !== undefined) {
    out.acceptedPartnerAlcohol = assertStringInEnum(
      p.acceptedPartnerAlcohol,
      enumValues(AcceptedPartnerAlcohol),
      'structuredPreferences.acceptedPartnerAlcohol',
    ) as AcceptedPartnerAlcohol;
  }

  if (p.partnerWantsChildren !== undefined) {
    out.partnerWantsChildren = assertStringInEnum(
      p.partnerWantsChildren,
      enumValues(PartnerWantsChildrenRequirement),
      'structuredPreferences.partnerWantsChildren',
    ) as PartnerWantsChildrenRequirement;
  }

  if (p.partnerHasChildren !== undefined) {
    out.partnerHasChildren = assertStringInEnum(
      p.partnerHasChildren,
      enumValues(PartnerHasChildrenAcceptance),
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
    const allowed = new Set(enumValues(AcceptedPartnerGender));
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
    out.partnerAgeMin = assertIntegerAge(o.partnerAgeMin, 'searchOverrides.partnerAgeMin');
  }
  if (o.partnerAgeMax !== undefined) {
    out.partnerAgeMax = assertIntegerAge(o.partnerAgeMax, 'searchOverrides.partnerAgeMax');
  }
  if (out.partnerAgeMin !== undefined && out.partnerAgeMax !== undefined && out.partnerAgeMin > out.partnerAgeMax) {
    throw new Error('HolyGrail map: searchOverrides.partnerAgeMin must be <= partnerAgeMax');
  }
  if (o.minimumPartnerEducation !== undefined) {
    out.minimumPartnerEducation = assertStringInEnum(
      o.minimumPartnerEducation,
      enumValues(MinimumPartnerEducation),
      'searchOverrides.minimumPartnerEducation',
    ) as MinimumPartnerEducation;
  }
  if (o.acceptedPartnerSmoking !== undefined) {
    out.acceptedPartnerSmoking = assertStringInEnum(
      o.acceptedPartnerSmoking,
      enumValues(AcceptedPartnerSmoking),
      'searchOverrides.acceptedPartnerSmoking',
    ) as AcceptedPartnerSmoking;
  }
  if (o.acceptedPartnerAlcohol !== undefined) {
    out.acceptedPartnerAlcohol = assertStringInEnum(
      o.acceptedPartnerAlcohol,
      enumValues(AcceptedPartnerAlcohol),
      'searchOverrides.acceptedPartnerAlcohol',
    ) as AcceptedPartnerAlcohol;
  }
  if (o.partnerWantsChildren !== undefined) {
    out.partnerWantsChildren = assertStringInEnum(
      o.partnerWantsChildren,
      enumValues(PartnerWantsChildrenRequirement),
      'searchOverrides.partnerWantsChildren',
    ) as PartnerWantsChildrenRequirement;
  }
  if (o.partnerHasChildren !== undefined) {
    out.partnerHasChildren = assertStringInEnum(
      o.partnerHasChildren,
      enumValues(PartnerHasChildrenAcceptance),
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

  const profileId = assertNonEmptyProfileId(input.profileId);
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: buildFacts(input),
    preferences: buildPreferences(input.structuredPreferences),
    searchOverrides: parseSearchOverrides(input.searchOverrides),
  };
}
