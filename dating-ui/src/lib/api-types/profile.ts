/** Matches dating-api `ProfileGender` enum (product profile). */
export type MeProfileGender =
  | 'MALE'
  | 'FEMALE'
  | 'NON_BINARY'
  | 'OTHER'
  | 'PREFER_NOT_TO_SAY';

export const ME_PROFILE_GENDERS: readonly MeProfileGender[] = [
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'OTHER',
  'PREFER_NOT_TO_SAY',
] as const;

/** Openness to match; excludes `PREFER_NOT_TO_SAY` (not meaningful for partner filters). */
export type MePartnerGenderChoice = Exclude<
  MeProfileGender,
  'PREFER_NOT_TO_SAY'
>;

export const ME_PARTNER_GENDER_CHOICES: readonly MePartnerGenderChoice[] = [
  'MALE',
  'FEMALE',
  'NON_BINARY',
  'OTHER',
];

/** Mirrors dating-api `UserProfileOnboardingStep`. */
export type MeProfileOnboardingStep = 'BASIC' | 'TEXTS' | 'COMPLETED';

/** Mirrors dating-api `DatingChapter` / TeaserMode. */
export type MeDatingChapter =
  | 'first_chapter'
  | 'ready_again'
  | 'new_chapter';

export const ME_DATING_CHAPTERS: readonly MeDatingChapter[] = [
  'first_chapter',
  'ready_again',
  'new_chapter',
] as const;

export type InferredDealbreakerDto = {
  tag: string;
  classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE';
  evidence: string;
  confidence: number;
};

export interface MeProfileDto {
  id: string;
  userId: string;
  status: string;
  onboardingStep: MeProfileOnboardingStep;
  nickname?: string | null;
  onboardingCompletedAt?: string | null;
  aboutMe: string | null;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  birthDate?: string | null;
  datingChapter?: MeDatingChapter | null;
  gender?: MeProfileGender | null;
  desiredPartnerGenders?: MeProfileGender[] | null;
  city?: string | null;
  country?: string | null;
  locationLabel?: string | null;
  submittedAt?: string | null;
  analyzedAt?: string | null;
  lastAnalysisError?: string | null;
  createdAt: string;
  updatedAt: string;
  partnerAgeMin?: number | null;
  partnerAgeMax?: number | null;
  maxDistanceKm?: number | null;
  inferredDealbreakers?: InferredDealbreakerDto[];
}

export interface CreateMeProfileBody {
  aboutMe?: string | null;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
  onboardingStep?: MeProfileOnboardingStep;
  nickname?: string | null;
  birthDate?: string | null;
  datingChapter?: MeDatingChapter | null;
  gender?: MeProfileGender | null;
  desiredPartnerGenders?: MeProfileGender[] | null;
  city?: string | null;
  country?: string | null;
  locationLabel?: string | null;
  partnerAgeMin?: number | null;
  partnerAgeMax?: number | null;
  maxDistanceKm?: number | null;
}

export type PatchMeProfileBody = CreateMeProfileBody;

export type MeProfileSubmitResult = {
  analysisJobId: string;
  profile: MeProfileDto;
};
