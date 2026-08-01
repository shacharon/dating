import { UnprocessableEntityException } from '@nestjs/common';
import {
  Prisma,
  ProfileGender,
  UserProfile,
  UserProfileOnboardingStep,
  UserProfilePreference,
} from '@prisma/client';
import { markHttpExceptionObservabilityLogged } from '../../logging/observability-http.exception';
import { extractDealbreakerSignalsFromFreeText } from '../../holy-grail-matching/dealbreaker-signals-text.extract';
import type {
  CreateMeProfileDto,
  MeProfileResponseDto,
  PatchMeProfileDto,
} from '../me-profile.dto';

const PROFILE_GENDER_VALUES = new Set<string>(
  Object.values(ProfileGender) as string[],
);

/**
 * Statuses that are eligible to be re-submitted.
 * SUBMITTED and ANALYZING are rejected — an in-flight submission is already pending.
 *
 * String literals are used here so the guard works before `prisma generate` is
 * run after the migration. Once the client is regenerated, the enum values will
 * resolve to the same strings.
 */
export const SUBMITTABLE_STATUSES = new Set<string>([
  'DRAFT',
  'ANALYZED',
  'FAILED',
]);

/** Trims profile nicknames; blank input becomes `null`. */
export function normalizeNicknameValue(
  value: string | null | undefined,
): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function parseDesiredPartnerGenders(
  raw: Prisma.JsonValue | null,
): ProfileGender[] | null {
  if (raw === null || raw === undefined) {
    return null;
  }
  if (!Array.isArray(raw)) {
    return null;
  }
  const out: ProfileGender[] = [];
  for (const x of raw) {
    if (typeof x !== 'string' || !PROFILE_GENDER_VALUES.has(x)) {
      return null;
    }
    out.push(x as ProfileGender);
  }
  return out.length > 0 ? out : null;
}

/**
 * Product JSON `desiredPartnerGenders` → `UserProfilePreference.acceptedPartnerGenders`
 * (same filter as the API DTO path; keeps the normalized row aligned with `UserProfile`).
 */
export function acceptedPartnerGendersFromDesiredJson(
  raw: Prisma.JsonValue | null | undefined,
): string[] {
  if (raw === null || raw === undefined || !Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (g): g is string =>
      typeof g === 'string' && g !== ProfileGender.PREFER_NOT_TO_SAY,
  );
}

export function mergedTextForOnboarding(
  existing: UserProfile | null,
  body: CreateMeProfileDto | PatchMeProfileDto,
  key: 'aboutMe' | 'aboutPartner' | 'aboutRelationship',
): string | null {
  if (body[key] !== undefined) {
    return body[key] as string | null;
  }
  return existing?.[key] ?? null;
}

export function mergedDesiredPartnerGendersForOnboarding(
  existing: UserProfile | null,
  body: CreateMeProfileDto | PatchMeProfileDto,
): ProfileGender[] | null {
  if (body.desiredPartnerGenders !== undefined) {
    if (body.desiredPartnerGenders === null) {
      return null;
    }
    return body.desiredPartnerGenders;
  }
  if (!existing) {
    return null;
  }
  return parseDesiredPartnerGenders(existing.desiredPartnerGenders);
}

export function isNonEmptyTrimmedText(
  value: string | null | undefined,
): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Enforces two-step onboarding: TEXTS requires partner genders; COMPLETED requires all three text fields.
 * BASIC is always allowed (partial saves). Analysis still only runs on profile submit.
 */
export function assertOnboardingStepCoherent(
  existing: UserProfile | null,
  body: CreateMeProfileDto | PatchMeProfileDto,
): void {
  if (body.onboardingStep === undefined) {
    return;
  }
  if (body.onboardingStep === UserProfileOnboardingStep.BASIC) {
    return;
  }
  if (body.onboardingStep === UserProfileOnboardingStep.TEXTS) {
    const genders = mergedDesiredPartnerGendersForOnboarding(existing, body);
    if (!genders?.length) {
      const ex = new UnprocessableEntityException({
        error: 'onboarding_partner_genders_required',
        message:
          'Set at least one desiredPartnerGenders value before moving onboarding to TEXTS.',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
    return;
  }
  if (body.onboardingStep === UserProfileOnboardingStep.COMPLETED) {
    const aboutMe = mergedTextForOnboarding(existing, body, 'aboutMe');
    const aboutPartner = mergedTextForOnboarding(existing, body, 'aboutPartner');
    const aboutRelationship = mergedTextForOnboarding(
      existing,
      body,
      'aboutRelationship',
    );
    if (
      !isNonEmptyTrimmedText(aboutMe) ||
      !isNonEmptyTrimmedText(aboutPartner) ||
      !isNonEmptyTrimmedText(aboutRelationship)
    ) {
      const ex = new UnprocessableEntityException({
        error: 'onboarding_texts_incomplete',
        message:
          'aboutMe, aboutPartner, and aboutRelationship must all be non-empty before onboarding can be COMPLETED.',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }
}

export function applyOnboardingCompletionToWriteData(
  data: Prisma.UserProfileUpdateInput,
  body: CreateMeProfileDto | PatchMeProfileDto,
  existingCompletedAt: Date | null | undefined,
): void {
  if (body.onboardingStep !== UserProfileOnboardingStep.COMPLETED) {
    return;
  }
  if (existingCompletedAt) {
    return;
  }
  data.onboardingCompletedAt = new Date();
}

export function toResponse(
  row: UserProfile,
  preference: UserProfilePreference | null,
): MeProfileResponseDto {
  const inferredDealbreakers = extractDealbreakerSignalsFromFreeText({
    aboutMe: row.aboutMe,
    aboutPartner: row.aboutPartner,
    aboutRelationship: row.aboutRelationship,
  }).signals
    .filter(
      (s): s is typeof s & {
        classification: 'HARD_EXCLUDE' | 'HARD_REQUIRE';
      } =>
        s.classification === 'HARD_EXCLUDE' ||
        s.classification === 'HARD_REQUIRE',
    )
    .map((s) => ({
      tag: s.tag as string,
      classification: s.classification,
      evidence: s.evidence,
      confidence: s.confidence,
    }));

  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    nickname: row.nickname ?? null,
    onboardingStep: row.onboardingStep,
    onboardingCompletedAt: row.onboardingCompletedAt ?? null,
    aboutMe: row.aboutMe,
    aboutPartner: row.aboutPartner,
    aboutRelationship: row.aboutRelationship,
    birthDate: row.birthDate ?? null,
    gender: row.gender ?? null,
    desiredPartnerGenders: parseDesiredPartnerGenders(row.desiredPartnerGenders),
    city: row.city ?? null,
    country: row.country ?? null,
    locationLabel: row.locationLabel ?? null,
    submittedAt: row.submittedAt ?? null,
    analyzedAt: row.analyzedAt ?? null,
    lastAnalysisError: row.lastAnalysisError ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // HG structured facts
    childrenStatus: row.childrenStatus ?? null,
    wantsChildren: row.wantsChildren ?? null,
    smokingFrequency: row.smokingFrequency ?? null,
    alcoholUse: row.alcoholUse ?? null,
    education: row.education ?? null,
    religion: row.religion ?? null,
    // HG structured preferences (Phase F: UserProfilePreference only)
    partnerAgeMin: preference?.partnerAgeMin ?? null,
    partnerAgeMax: preference?.partnerAgeMax ?? null,
    maxDistanceKm: preference?.maxDistanceKm ?? null,
    inferredDealbreakers,
  };
}

/** Plain preference field values extracted from a create/patch DTO. */
export type PreferenceFields = {
  acceptedPartnerGenders?: string[];
  partnerAgeMin?: number | null;
  partnerAgeMax?: number | null;
  maxDistanceKm?: number | null;
};

/**
 * Phase C dual-write: extract preference fields from a create/patch body.
 * Maps `desiredPartnerGenders` → `acceptedPartnerGenders`, dropping PREFER_NOT_TO_SAY.
 */
export function toPreferenceData(
  body: CreateMeProfileDto | PatchMeProfileDto,
): PreferenceFields {
  const data: PreferenceFields = {};
  if (body.desiredPartnerGenders !== undefined) {
    data.acceptedPartnerGenders = acceptedPartnerGendersFromDesiredJson(
      body.desiredPartnerGenders === null
        ? null
        : (body.desiredPartnerGenders as unknown as Prisma.JsonValue),
    );
  }
  if (body.partnerAgeMin !== undefined) data.partnerAgeMin = body.partnerAgeMin;
  if (body.partnerAgeMax !== undefined) data.partnerAgeMax = body.partnerAgeMax;
  if (body.maxDistanceKm !== undefined) data.maxDistanceKm = body.maxDistanceKm;
  return data;
}

export function toPrismaWritableData(
  body: CreateMeProfileDto | PatchMeProfileDto,
): Prisma.UserProfileUpdateInput {
  const data: Prisma.UserProfileUpdateInput = {};
  if (body.aboutMe !== undefined) {
    data.aboutMe = body.aboutMe;
  }
  if (body.aboutPartner !== undefined) {
    data.aboutPartner = body.aboutPartner;
  }
  if (body.aboutRelationship !== undefined) {
    data.aboutRelationship = body.aboutRelationship;
  }
  if (body.nickname !== undefined) {
    data.nickname = normalizeNicknameValue(body.nickname);
  }
  if (body.onboardingStep !== undefined) {
    data.onboardingStep = body.onboardingStep;
  }
  if (body.birthDate !== undefined) {
    data.birthDate =
      body.birthDate === null ? null : new Date(body.birthDate);
  }
  if (body.gender !== undefined) {
    // DB column is NOT NULL; DTO allows null (cleared / prefer-not-to-say intent).
    data.gender = body.gender ?? ProfileGender.PREFER_NOT_TO_SAY;
  }
  if (body.city !== undefined) {
    data.city = body.city;
  }
  if (body.country !== undefined) {
    data.country = body.country;
  }
  if (body.locationLabel !== undefined) {
    data.locationLabel = body.locationLabel;
  }
  if (body.desiredPartnerGenders !== undefined) {
    data.desiredPartnerGenders =
      body.desiredPartnerGenders === null
        ? Prisma.DbNull
        : body.desiredPartnerGenders;
  }

  // HG structured facts
  if (body.childrenStatus !== undefined) data.childrenStatus = body.childrenStatus;
  if (body.wantsChildren !== undefined) data.wantsChildren = body.wantsChildren;
  if (body.smokingFrequency !== undefined) data.smokingFrequency = body.smokingFrequency;
  if (body.alcoholUse !== undefined) data.alcoholUse = body.alcoholUse;
  if (body.education !== undefined) data.education = body.education;
  if (body.religion !== undefined) data.religion = body.religion;

  return data;
}
