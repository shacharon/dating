/**
 * HOLY_GRAIL_MATCHING — Step 1: canonical matching contract (source of truth).
 *
 * Edit this file freely to evolve the product contract. This module is the single place
 * that defines the matching payload shape; keep it readable and avoid mixing in persistence
 * or API wiring here.
 *
 * ── Separation of concerns (do not collapse these layers) ──
 *
 * 1. **Canonical model types** — THIS FILE ONLY: `MatchingCanonicalModel` and its enums /
 *    interfaces. Pure TypeScript; describes what “matching profile data” means in the app.
 *
 * 2. **Persistence mapping** — elsewhere (e.g. mappers, repositories): translates between
 *    `MatchingCanonicalModel` and stored form (JSON columns, normalized tables, cache DTOs).
 *    Adding mappers does not change the canonical definitions here.
 *
 * 3. **DB schema** — Prisma/migrations/actual columns: what the database can store and index.
 *    Schema changes are explicit migrations; they are NOT implied by edits to this file.
 *
 * Important: changing these interfaces and enums does NOT automatically change the DB schema.
 * When storage must reflect new fields, enums, or constraints, update persistence mapping and
 * apply a Prisma migration (or equivalent) deliberately.
 *
 * ── Model shape ──
 *
 * - Facts: attributes of the user only. No predicates about others; not used as filters by definition.
 * - Preferences: strict non-negotiable acceptance rules (what a candidate must satisfy).
 * - Search overrides: ephemeral replacements for preference fields for a search/discovery context.
 *
 * No scoring, dealbreakers, ranking, or matching engine logic belongs in this module.
 */

export const MATCHING_CANONICAL_MODEL_VERSION =
  'matching_canonical_v1' as const;
export type MatchingCanonicalModelVersion =
  typeof MATCHING_CANONICAL_MODEL_VERSION;

// ---------------------------------------------------------------------------
// Shared enums (allowed values). Reused only where the same vocabulary applies.
// ---------------------------------------------------------------------------

/** User's gender identity (self-description). */
export enum GenderIdentity {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's sexual orientation (self-description). */
export enum SexualOrientationSelf {
  STRAIGHT = 'STRAIGHT',
  GAY = 'GAY',
  LESBIAN = 'LESBIAN',
  BISEXUAL = 'BISEXUAL',
  PANSEXUAL = 'PANSEXUAL',
  ASEXUAL = 'ASEXUAL',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** Current relationship / marital status of the user. */
export enum RelationshipStatusSelf {
  SINGLE = 'SINGLE',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  SEPARATED = 'SEPARATED',
  IN_RELATIONSHIP = 'IN_RELATIONSHIP',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** Whether the user has children (fact about the user). */
export enum ChildrenStatusSelf {
  NO = 'NO',
  YES_LIVES_WITH_ME = 'YES_LIVES_WITH_ME',
  YES_NOT_WITH_ME = 'YES_NOT_WITH_ME',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's own desire regarding having (more) children. */
export enum WantsChildrenSelf {
  YES = 'YES',
  NO = 'NO',
  UNSURE = 'UNSURE',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's smoking behavior. */
export enum SmokingFrequencySelf {
  NEVER = 'NEVER',
  SOCIAL = 'SOCIAL',
  REGULAR = 'REGULAR',
  FORMER = 'FORMER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's alcohol use. */
export enum AlcoholUseSelf {
  NEVER = 'NEVER',
  RARE = 'RARE',
  MODERATE = 'MODERATE',
  FREQUENT = 'FREQUENT',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's typical exercise level. */
export enum ExerciseLevelSelf {
  SEDENTARY = 'SEDENTARY',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's religious affiliation or identity. */
export enum ReligionSelf {
  NONE = 'NONE',
  CHRISTIAN = 'CHRISTIAN',
  JEWISH = 'JEWISH',
  MUSLIM = 'MUSLIM',
  HINDU = 'HINDU',
  BUDDHIST = 'BUDDHIST',
  SPIRITUAL_NON_AFFILIATED = 'SPIRITUAL_NON_AFFILIATED',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's political leaning (self-identified). */
export enum PoliticsSelf {
  VERY_LIBERAL = 'VERY_LIBERAL',
  LIBERAL = 'LIBERAL',
  MODERATE = 'MODERATE',
  CONSERVATIVE = 'CONSERVATIVE',
  VERY_CONSERVATIVE = 'VERY_CONSERVATIVE',
  APOLITICAL = 'APOLITICAL',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's highest completed education level. */
export enum EducationLevelSelf {
  LESS_THAN_HIGH_SCHOOL = 'LESS_THAN_HIGH_SCHOOL',
  HIGH_SCHOOL = 'HIGH_SCHOOL',
  SOME_COLLEGE = 'SOME_COLLEGE',
  BACHELORS = 'BACHELORS',
  GRADUATE = 'GRADUATE',
  DOCTORATE = 'DOCTORATE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** User's living arrangement. */
export enum LivingSituationSelf {
  ALONE = 'ALONE',
  ROOMMATES = 'ROOMMATES',
  FAMILY = 'FAMILY',
  PARTNER = 'PARTNER',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

/** Coarse work/study situation of the user. */
export enum WorkStudySituationSelf {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  STUDENT = 'STUDENT',
  RETIRED = 'RETIRED',
  NOT_EMPLOYED = 'NOT_EMPLOYED',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

// --- Preference-side enums (acceptance rules about a partner) ---

/** Partner genders the user will accept (non-negotiable when preferences are enforced). */
export enum AcceptedPartnerGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  NON_BINARY = 'NON_BINARY',
  OTHER = 'OTHER',
}

// ---------------------------------------------------------------------------
// Layer 1 — Facts (user only; no filtering semantics)
// ---------------------------------------------------------------------------

/**
 * Declarative facts about the user. Must not encode requirements on candidates.
 * Optional fields mean unknown / not provided — not “no constraint”.
 */
export interface MatchingFacts {
  genderIdentity?: GenderIdentity;
  sexualOrientation?: SexualOrientationSelf;
  relationshipStatus?: RelationshipStatusSelf;
  childrenStatus?: ChildrenStatusSelf;
  wantsChildren?: WantsChildrenSelf;
  smoking?: SmokingFrequencySelf;
  alcoholUse?: AlcoholUseSelf;
  exerciseLevel?: ExerciseLevelSelf;
  religion?: ReligionSelf;
  politics?: PoliticsSelf;
  education?: EducationLevelSelf;
  livingSituation?: LivingSituationSelf;
  workStudySituation?: WorkStudySituationSelf;
  /**
   * Opaque, normalized hobby/interest tags describing the user.
   * Values are not matching rules; indexing/filtering is out of scope for this type.
   */
  interestTags?: readonly string[];
  /** ISO 8601 calendar date (YYYY-MM-DD) if known. */
  dateOfBirth?: string;
  /** Primary location label (e.g. city or region), display/storage only at this layer. */
  primaryLocationLabel?: string;
}

// ---------------------------------------------------------------------------
// Layer 2 — Preferences (strict acceptance rules)
// ---------------------------------------------------------------------------

/**
 * Stored user preferences (sparse). **Omitted** fields mean **no preference defined**
 * for that dimension (evaluator `SKIPPED`), not “widest accept.”
 * When a field is **present**, the candidate must satisfy that constraint (per Step 3).
 * Explicit `ANY` / `NO_REQUIREMENT` remain valid **user-authored** values when stored.
 */
export interface MatchingPreferences {
  acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  /** Inclusive age bounds; omit either side if open-ended. */
  partnerAgeMin?: number;
  partnerAgeMax?: number;
  /**
   * Maximum distance from the user's search anchor, in kilometers.
   * Omit if distance is not a hard constraint.
   */
  maxDistanceKm?: number;
}

// ---------------------------------------------------------------------------
// Layer 3 — search_overrides (ephemeral preference overrides)
// ---------------------------------------------------------------------------

/**
 * Temporary overrides applied on top of `MatchingPreferences` for search/discovery.
 * Semantics: when a field is present, it replaces the corresponding preference for that context.
 * Must not introduce facts or user-only attributes.
 */
export interface MatchingSearchOverrides {
  acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  partnerAgeMin?: number;
  partnerAgeMax?: number;
  maxDistanceKm?: number;
  /** When set, overrides should not be applied after this instant (ISO 8601). */
  validUntil?: string;
}

// ---------------------------------------------------------------------------
// Post-eligibility ranking (optional sidecar; not read by HG hard filter / evaluator)
// ---------------------------------------------------------------------------

/**
 * Five deterministic HG rank signals parsed from DB (enrichment + self signal snapshot + interests),
 * plus optional **canonical** personality trait tags (v1+v2 allowlist) from free-text extraction (`personality-traits-text.extract`),
 * optional **lifestyle signal** tags v1+v2 allowlist (`lifestyle-signals-text.extract`),
 * and optional **interest tags** v1+v2 allowlist (`interest-tags-text.extract`).
 * Used only for post-eligibility ranking — never for hard filters.
 */
export interface MatchingRankingSignalsSnapshot {
  readonly dailyRhythm: string | null;
  readonly autonomyTogetherness: string | null;
  readonly conflictStyle: number | null;
  readonly lifestylePace: number | null;
  readonly interestsTop: readonly string[];
  /** Traits grounded in `aboutMe` text (canonical ids). */
  readonly personalityTraitsSelf?: readonly string[];
  /** Traits grounded in `aboutPartner` text (canonical ids). */
  readonly personalityTraitsPartner?: readonly string[];
  /** Lifestyle signals (v1+v2 allowlist) from `aboutMe` (canonical ids). */
  readonly lifestyleSignalsSelf?: readonly string[];
  /** Lifestyle signals (v1+v2 allowlist) from `aboutPartner` (canonical ids). */
  readonly lifestyleSignalsPartner?: readonly string[];
  /** Interest tags (v1+v2 allowlist) from `aboutMe`. */
  readonly interestTagsSelf?: readonly string[];
  /** Interest tags (v1+v2 allowlist) from `aboutPartner`. */
  readonly interestTagsPartner?: readonly string[];
}

// ---------------------------------------------------------------------------
// Root document
// ---------------------------------------------------------------------------

export interface MatchingCanonicalModel {
  readonly version: MatchingCanonicalModelVersion;
  profileId: string;
  facts: MatchingFacts;
  preferences: MatchingPreferences;
  /** search_overrides — camelCase in TS; same conceptual layer. */
  searchOverrides: MatchingSearchOverrides;
  /** Optional; used only after HG PASS for ordering. Never affects eligibility. */
  readonly rankingSignals?: MatchingRankingSignalsSnapshot;
}
