/**
 * Structured inputs for Step 4 → `MatchingCanonicalModel` mapping.
 * No raw profile text: callers populate from DB columns / validated API payloads only.
 *
 * **Persisted vs mapper-only:** `UserProfile.holyGrailStructured{Facts,Preferences}` JSON round-trips only
 * through keys in `holy-grail-structured-contract.ts` (`*_JSON_KEYS`). Mapper-only fields never pass
 * `parseHolyGrailStructured*FromJson` and are rejected on structured JSON merge writes.
 */

import type {
  AcceptedPartnerAlcohol,
  AcceptedPartnerGender,
  AcceptedPartnerSmoking,
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  ExerciseLevelSelf,
  GenderIdentity,
  LivingSituationSelf,
  MatchingRankingSignalsSnapshot,
  MatchingSearchOverrides,
  MinimumPartnerEducation,
  PartnerHasChildrenAcceptance,
  PartnerWantsChildrenRequirement,
  PoliticsSelf,
  ReligionSelf,
  RelationshipStatusSelf,
  SexualOrientationSelf,
  SmokingFrequencySelf,
  WantsChildrenSelf,
  WorkStudySituationSelf,
  SimilarityPreference,
} from '../canonical/matching-canonical.types';
import {
  HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS,
  HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_ONLY_KEYS,
  HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS,
  HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_ONLY_KEYS,
} from './holy-grail-structured-contract';

type TupleToUnion<T extends readonly string[]> = T[number];

/** @see `HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS` */
export type HolyGrailStructuredFactsPersistedKey = TupleToUnion<typeof HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS>;
/** @see `HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_ONLY_KEYS` */
export type HolyGrailStructuredFactsMapperOnlyKey = TupleToUnion<typeof HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_ONLY_KEYS>;
/** @see `HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS` */
export type HolyGrailStructuredPreferencesPersistedKey = TupleToUnion<
  typeof HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS
>;
/** @see `HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_ONLY_KEYS` */
export type HolyGrailStructuredPreferencesMapperOnlyKey = TupleToUnion<
  typeof HOLY_GRAIL_STRUCTURED_PREFERENCES_MAPPER_ONLY_KEYS
>;

type HolyGrailStructuredFactsFieldMap = {
  genderIdentity: GenderIdentity;
  sexualOrientation: SexualOrientationSelf;
  relationshipStatus: RelationshipStatusSelf;
  childrenStatus: ChildrenStatusSelf;
  wantsChildren: WantsChildrenSelf;
  smoking: SmokingFrequencySelf;
  alcoholUse: AlcoholUseSelf;
  exerciseLevel: ExerciseLevelSelf;
  religion: ReligionSelf;
  politics: PoliticsSelf;
  education: EducationLevelSelf;
  livingSituation: LivingSituationSelf;
  workStudySituation: WorkStudySituationSelf;
  dateOfBirth: string;
  primaryLocationLabel: string;
};

type HolyGrailStructuredPreferencesFieldMap = {
  acceptedPartnerGenders: readonly AcceptedPartnerGender[];
  partnerAgeMin: number;
  partnerAgeMax: number;
  minimumPartnerEducation: MinimumPartnerEducation;
  acceptedPartnerSmoking: AcceptedPartnerSmoking;
  acceptedPartnerAlcohol: AcceptedPartnerAlcohol;
  partnerWantsChildren: PartnerWantsChildrenRequirement;
  partnerHasChildren: PartnerHasChildrenAcceptance;
  acceptedPartnerReligions: readonly ReligionSelf[];
  maxDistanceKm: number;
  similarityPreference: SimilarityPreference | null;
};

/**
 * Sparse facts read from `holyGrailStructuredFacts` JSON (`parseHolyGrailStructuredFactsFromJson`).
 */
export type HolyGrailStructuredFactsPersisted = Partial<
  Pick<HolyGrailStructuredFactsFieldMap, HolyGrailStructuredFactsPersistedKey>
>;

/**
 * Structured fact fields accepted only on `HolyGrailProfileMappingInput` (not stored in HG structured facts JSON).
 */
export type HolyGrailStructuredFactsMapperOnly = Partial<
  Pick<HolyGrailStructuredFactsFieldMap, HolyGrailStructuredFactsMapperOnlyKey>
>;

/** Full structured facts slice for `mapProfileSourceToMatchingCanonical` (persisted JSON ∪ mapper-only). */
export type HolyGrailStructuredFactsInput = HolyGrailStructuredFactsPersisted & HolyGrailStructuredFactsMapperOnly;

/**
 * Sparse preferences read from `holyGrailStructuredPreferences` JSON (`parseHolyGrailStructuredPreferencesFromJson`).
 * Excludes mapper-only keys such as `maxDistanceKm`.
 */
export type HolyGrailStructuredPreferencesPersisted = Partial<
  Pick<HolyGrailStructuredPreferencesFieldMap, HolyGrailStructuredPreferencesPersistedKey>
>;

/** Mapper-only preference fields (e.g. geo until persisted under HG structured JSON). */
export type HolyGrailStructuredPreferencesMapperOnly = Partial<
  Pick<HolyGrailStructuredPreferencesFieldMap, HolyGrailStructuredPreferencesMapperOnlyKey>
>;

/** Full structured preferences slice for the mapper (persisted JSON ∪ mapper-only). */
export type HolyGrailStructuredPreferencesInput = HolyGrailStructuredPreferencesPersisted &
  HolyGrailStructuredPreferencesMapperOnly;

/** Prisma `String[]` slices (or copies) allowed into the mapper — strings only. */
export interface HolyGrailExtractionArraysInput {
  readonly interests_self?: readonly string[];
  readonly interests?: readonly string[];
  readonly lifestyleTraits?: readonly string[];
}

export interface HolyGrailProfileMappingInput {
  readonly profileId: string;
  readonly extractionArrays?: HolyGrailExtractionArraysInput;
  readonly structuredFacts?: HolyGrailStructuredFactsInput;
  readonly structuredPreferences?: HolyGrailStructuredPreferencesInput;
  /** Validated subset of `MatchingSearchOverrides`; same field rules as preferences where shared. */
  readonly searchOverrides?: Readonly<MatchingSearchOverrides>;
  /**
   * Optional ranking sidecar (DB-derived). Ignored by `mapProfileSourceToMatchingCanonical` for facts/prefs;
   * copied onto `MatchingCanonicalModel.rankingSignals` only. Never affects HG eligibility.
   */
  readonly rankingSignals?: MatchingRankingSignalsSnapshot;
}

/** @deprecated Use `HolyGrailProfileMappingInput`; kept for short-term grep compatibility. */
export type HolyGrailProfileSourceStub = Pick<HolyGrailProfileMappingInput, 'profileId'>;
