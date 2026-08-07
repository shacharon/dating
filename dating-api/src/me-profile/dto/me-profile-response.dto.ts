import type {
  DatingChapter,
  ProfileGender,
  UserProfileOnboardingStep,
  UserProfileStatus,
} from '@prisma/client';

export type InferredDealbreakerDto = {
  tag: string;
  classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE';
  evidence: string;
  confidence: number;
};

/**
 * GET / POST / PATCH success body for `/api/v1/me/profile`.
 * Dates serialize to ISO 8601 strings in JSON responses.
 * HG fact/preference fields are string literals matching the canonical enums;
 * null means the field has not been set.
 */
export class MeProfileResponseDto {
  id!: string;
  userId!: string;
  status!: UserProfileStatus;
  nickname!: string | null;
  onboardingStep!: UserProfileOnboardingStep;
  onboardingCompletedAt!: Date | null;
  aboutMe!: string | null;
  aboutPartner!: string | null;
  aboutRelationship!: string | null;
  birthDate!: Date | null;
  /** Match-card teaser presentation intent; null → age proxy on server. */
  datingChapter!: DatingChapter | null;
  gender!: ProfileGender | null;
  /** Parsed from stored JSON; `null` if unset or not a valid enum string array. */
  desiredPartnerGenders!: ProfileGender[] | null;
  city!: string | null;
  country!: string | null;
  locationLabel!: string | null;
  submittedAt!: Date | null;
  analyzedAt!: Date | null;
  lastAnalysisError!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  // ── Holy Grail structured facts (self) ──────────────────────────────────────
  childrenStatus!: string | null;
  wantsChildren!: string | null;
  smokingFrequency!: string | null;
  alcoholUse!: string | null;
  education!: string | null;
  religion!: string | null;

  // ── Holy Grail structured preferences (partner requirements) ─────────────────
  partnerAgeMin!: number | null;
  partnerAgeMax!: number | null;
  maxDistanceKm!: number | null;

  /**
   * Post-guardrail HARD_EXCLUDE / HARD_REQUIRE inferred from free text (Sprint 17).
   * Empty when none. Read-only — not a user-configured setting.
   */
  inferredDealbreakers!: InferredDealbreakerDto[];
}
