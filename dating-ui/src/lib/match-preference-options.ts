/** Mirror dating-api `matching-canonical.types.ts` wire values for match preferences UI. */

export const MINIMUM_PARTNER_EDUCATION_VALUES = [
  'ANY',
  'HIGH_SCHOOL',
  'SOME_COLLEGE',
  'BACHELORS',
  'GRADUATE',
] as const;
export type MinimumPartnerEducation =
  (typeof MINIMUM_PARTNER_EDUCATION_VALUES)[number];

export const ACCEPTED_PARTNER_SMOKING_VALUES = [
  'NONE_ONLY',
  'SOCIAL_OK',
  'ANY',
] as const;
export type AcceptedPartnerSmoking =
  (typeof ACCEPTED_PARTNER_SMOKING_VALUES)[number];

export const ACCEPTED_PARTNER_ALCOHOL_VALUES = [
  'NONE_ONLY',
  'MODERATE_OK',
  'ANY',
] as const;
export type AcceptedPartnerAlcohol =
  (typeof ACCEPTED_PARTNER_ALCOHOL_VALUES)[number];

export const PARTNER_WANTS_CHILDREN_VALUES = [
  'MUST_WANT',
  'MUST_NOT_WANT',
  'NO_REQUIREMENT',
] as const;
export type PartnerWantsChildrenRequirement =
  (typeof PARTNER_WANTS_CHILDREN_VALUES)[number];

export const PARTNER_HAS_CHILDREN_VALUES = [
  'ACCEPT',
  'DOES_NOT_ACCEPT',
  'NO_REQUIREMENT',
] as const;
export type PartnerHasChildrenAcceptance =
  (typeof PARTNER_HAS_CHILDREN_VALUES)[number];

export const ACCEPTED_PARTNER_RELIGION_VALUES = [
  'NONE',
  'CHRISTIAN',
  'JEWISH',
  'MUSLIM',
  'HINDU',
  'BUDDHIST',
  'SPIRITUAL_NON_AFFILIATED',
  'OTHER',
] as const;
export type AcceptedPartnerReligion =
  (typeof ACCEPTED_PARTNER_RELIGION_VALUES)[number];

export const SIMILARITY_PREFERENCE_VALUES = [
  'similar',
  'different',
  'balanced',
] as const;
export type SimilarityPreference =
  (typeof SIMILARITY_PREFERENCE_VALUES)[number];
