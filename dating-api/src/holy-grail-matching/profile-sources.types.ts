/**
 * Structured inputs for Step 4 → `MatchingCanonicalModel` mapping.
 * No raw profile text: callers populate from DB columns / validated API payloads only.
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

/** Prisma `String[]` slices (or copies) allowed into the mapper — strings only. */
export interface HolyGrailExtractionArraysInput {
  readonly interests_self?: readonly string[];
  readonly interests?: readonly string[];
  readonly lifestyleTraits?: readonly string[];
}

/** Optional enum facts — each field omitted means “do not set on `MatchingFacts`”. */
export interface HolyGrailStructuredFactsInput {
  readonly genderIdentity?: GenderIdentity;
  readonly sexualOrientation?: SexualOrientationSelf;
  readonly relationshipStatus?: RelationshipStatusSelf;
  readonly childrenStatus?: ChildrenStatusSelf;
  readonly wantsChildren?: WantsChildrenSelf;
  readonly smoking?: SmokingFrequencySelf;
  readonly alcoholUse?: AlcoholUseSelf;
  readonly exerciseLevel?: ExerciseLevelSelf;
  readonly religion?: ReligionSelf;
  readonly politics?: PoliticsSelf;
  readonly education?: EducationLevelSelf;
  readonly livingSituation?: LivingSituationSelf;
  readonly workStudySituation?: WorkStudySituationSelf;
  /** `YYYY-MM-DD` only; validated in mapper. */
  readonly dateOfBirth?: string;
  readonly primaryLocationLabel?: string;
}

/** Partial preferences; omitted keys stay absent on canonical `MatchingPreferences` (evaluator SKIPPED). */
export interface HolyGrailStructuredPreferencesInput {
  readonly acceptedPartnerGenders?: readonly AcceptedPartnerGender[];
  readonly partnerAgeMin?: number;
  readonly partnerAgeMax?: number;
  readonly minimumPartnerEducation?: MinimumPartnerEducation;
  readonly acceptedPartnerSmoking?: AcceptedPartnerSmoking;
  readonly acceptedPartnerAlcohol?: AcceptedPartnerAlcohol;
  readonly partnerWantsChildren?: PartnerWantsChildrenRequirement;
  readonly partnerHasChildren?: PartnerHasChildrenAcceptance;
  readonly acceptedPartnerReligions?: readonly ReligionSelf[];
  readonly maxDistanceKm?: number;
  readonly similarityPreference?: SimilarityPreference | null;
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
