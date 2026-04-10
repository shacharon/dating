/**
 * Single source of truth for Holy Grail structured JSON key allow-lists (DB read/write + mapper)
 * and partner-age bounds for ingestion paths. DOB YMD helpers live in `holy-grail-dob-ymd.ts`.
 */

export {
  assertHolyGrailCalendarDateYmd,
  assertHolyGrailDateOfBirthNotFuture,
  HOLY_GRAIL_DOB_YMD_RE,
  isHolyGrailDobYmdString,
  pickHolyGrailDateOfBirthDbJson,
} from './holy-grail-dob-ymd';

export const HOLY_GRAIL_PARTNER_AGE_INTEGER_MIN = 18;
export const HOLY_GRAIL_PARTNER_AGE_INTEGER_MAX = 120;

/** Sparse JSON read path: omit non-integers and values outside [18, 120]. */
export function tryParseHolyGrailPartnerAgeInteger(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isInteger(v)) return undefined;
  if (v < HOLY_GRAIL_PARTNER_AGE_INTEGER_MIN || v > HOLY_GRAIL_PARTNER_AGE_INTEGER_MAX) return undefined;
  return v;
}

/** Strict mapper path for partner age bounds on preferences / search overrides. */
export function assertHolyGrailStructuredMapPartnerAgeInteger(n: unknown, field: string): number {
  if (typeof n !== 'number' || !Number.isInteger(n)) {
    throw new Error(`HolyGrail map: ${field} must be an integer`);
  }
  if (n < HOLY_GRAIL_PARTNER_AGE_INTEGER_MIN || n > HOLY_GRAIL_PARTNER_AGE_INTEGER_MAX) {
    throw new Error(`HolyGrail map: ${field} must be in [18, 120], got ${n}`);
  }
  return n;
}

// --- Keys: persisted holyGrailStructuredFacts JSON (read + merge write + DB parse) ---

export const HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS = [
  'genderIdentity',
  'dateOfBirth',
  'childrenStatus',
  'wantsChildren',
  'smoking',
  'alcoholUse',
  'education',
  'religion',
] as const;

/** Extra structured fact fields allowed only on `HolyGrailProfileMappingInput` (mapper), not DB JSON. */
export const HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_ONLY_KEYS = [
  'sexualOrientation',
  'relationshipStatus',
  'exerciseLevel',
  'politics',
  'livingSituation',
  'workStudySituation',
  'primaryLocationLabel',
] as const;

export const HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEY_SET = new Set<string>(HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS);

export const HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_KEY_SET = new Set<string>([
  ...HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS,
  ...HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_ONLY_KEYS,
]);

// --- Keys: persisted holyGrailStructuredPreferences JSON (no maxDistanceKm until geo wire) ---

export const HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS = [
  'acceptedPartnerGenders',
  'partnerAgeMin',
  'partnerAgeMax',
  'minimumPartnerEducation',
  'acceptedPartnerSmoking',
  'acceptedPartnerAlcohol',
  'partnerWantsChildren',
  'partnerHasChildren',
  'acceptedPartnerReligions',
  'similarityPreference',
] as const;

export const HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_ONLY_KEYS = ['maxDistanceKm'] as const;

export const HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEY_SET = new Set<string>(
  HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS,
);

export const HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_KEY_SET = new Set<string>([
  ...HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS,
  ...HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_ONLY_KEYS,
]);

export const HOLY_GRAIL_SEARCH_OVERRIDE_KEYS = [
  ...HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS,
  ...HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_ONLY_KEYS,
  'validUntil',
] as const;

export const HOLY_GRAIL_SEARCH_OVERRIDE_KEY_SET = new Set<string>(HOLY_GRAIL_SEARCH_OVERRIDE_KEYS);
