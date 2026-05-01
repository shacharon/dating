/**
 * Pure mapping: UserProfile row slice + UserProfileEvaluation → ProfileJsonPayload / ChildrenUnsureProfileRow.
 *
 * Phase 1: engine scoring via buildProfilePayloadFromNewModel (compareWithStatus).
 * Phase 2: HG hard-eligibility gate via buildChildrenUnsureRowFromNewModel (evaluateHolyGrailPairDirections).
 *
 * Unlike the legacy ProfilesPrismaService path, NO stripping or re-injection of enrichment
 * signals is needed here. MeProfileAnalysisService stores the full EvaluateBatchResult
 * (including enrichment.signals.dailyRhythm / autonomyTogethernessDepth / interestsTop3)
 * directly into UserProfileEvaluation.evaluationJson without modification.
 */

import type { Prisma, UserProfileEvaluation } from '@prisma/client';
import type { ChildrenUnsureProfileRow } from '../matches/children-unsure-profile-row.types';
import type { EvaluateBatchResult } from '../evaluate/evaluate-batch.types';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import { parseAcceptedPartnerGendersFromProductJson } from './user-profile-matching-bridge.contract';

/** Minimum UserProfile fields required to build an engine-ready ProfileJsonPayload. */
export interface ProfileEngineSource {
  readonly id: string;
  readonly name: string;
  readonly aboutMe: string | null;
  readonly aboutPartner: string | null;
  readonly aboutRelationship: string | null;
}

/**
 * UserProfile fields required to build a ChildrenUnsureProfileRow for HG Layer-3
 * hard-eligibility evaluation. All HG columns are optional (null = not set → SKIPPED).
 * extractionV2 is not populated in Phase 2 (only hard eligibility is needed; ranking
 * signals are a Phase 3 concern).
 */
export interface ProfileHgSource extends ProfileEngineSource {
  readonly gender: string | null;
  readonly birthDate: Date | null;
  readonly desiredPartnerGenders: Prisma.JsonValue | null;
  // facts
  readonly childrenStatus: string | null;
  readonly wantsChildren: string | null;
  readonly smokingFrequency: string | null;
  readonly alcoholUse: string | null;
  readonly education: string | null;
  readonly religion: string | null;
  // preferences
  readonly partnerAgeMin: number | null;
  readonly partnerAgeMax: number | null;
  readonly minimumPartnerEducation: string | null;
  readonly acceptedPartnerSmoking: string[];
  readonly acceptedPartnerAlcohol: string[];
  readonly partnerWantsChildren: string | null;
  readonly partnerHasChildren: string | null;
  readonly acceptedPartnerReligions: string[];
  readonly maxDistanceKm: number | null;
  readonly similarityPreference: string | null;
}

/**
 * Maps a UserProfile row slice + a UserProfileEvaluation row to the ProfileJsonPayload
 * shape consumed by compareWithStatus (match engine).
 *
 * evaluationStatus is always 'DONE' here: callers must only pass evaluations that exist
 * (i.e. UserProfile.status === 'ANALYZED' and a UserProfileEvaluation row is present).
 */
export function buildProfilePayloadFromNewModel(
  profile: ProfileEngineSource,
  evaluation: Pick<UserProfileEvaluation, 'createdAt' | 'evaluationJson'>,
): ProfileJsonPayload {
  return {
    id: profile.id,
    name: profile.name,
    texts: {
      aboutMe: profile.aboutMe ?? '',
      aboutPartner: profile.aboutPartner ?? '',
      aboutRelationship: profile.aboutRelationship ?? '',
    },
    evaluation: evaluation.evaluationJson as unknown as EvaluateBatchResult,
    savedAt: evaluation.createdAt.toISOString(),
    evaluationStatus: 'DONE',
  };
}

/**
 * Maps a ProfileHgSource (new UserProfile columns) to a ChildrenUnsureProfileRow
 * for HG Layer-3 hard-eligibility evaluation via evaluateHolyGrailPairDirections.
 *
 * Phase 2 scope: only hard eligibility (facts + preferences). extractionV2 is null —
 * ranking signal enrichment is Phase 3.
 *
 * Graceful degradation: if a column is null the corresponding JSON key is omitted.
 * parseHolyGrailStructuredFactsFromJson treats an empty object as `undefined` → all
 * HG dimensions SKIP → overallHardEligibility === 'PASS'. The pair is never excluded
 * solely because HG data is missing.
 */
export function buildChildrenUnsureRowFromNewModel(
  profile: ProfileHgSource,
): ChildrenUnsureProfileRow {
  const facts: Record<string, unknown> = {};
  if (profile.gender !== null) facts.genderIdentity = profile.gender;
  if (profile.birthDate !== null) {
    facts.dateOfBirth = profile.birthDate.toISOString().slice(0, 10);
  }
  if (profile.childrenStatus !== null) facts.childrenStatus = profile.childrenStatus;
  if (profile.wantsChildren !== null) facts.wantsChildren = profile.wantsChildren;
  if (profile.smokingFrequency !== null) facts.smoking = profile.smokingFrequency;
  if (profile.alcoholUse !== null) facts.alcoholUse = profile.alcoholUse;
  if (profile.education !== null) facts.education = profile.education;
  if (profile.religion !== null) facts.religion = profile.religion;

  const prefs: Record<string, unknown> = {};
  const acceptedGenders = parseAcceptedPartnerGendersFromProductJson(
    profile.desiredPartnerGenders,
  );
  if (acceptedGenders !== null && acceptedGenders.length > 0) {
    prefs.acceptedPartnerGenders = acceptedGenders;
  }
  if (profile.partnerAgeMin !== null) prefs.partnerAgeMin = profile.partnerAgeMin;
  if (profile.partnerAgeMax !== null) prefs.partnerAgeMax = profile.partnerAgeMax;
  if (profile.minimumPartnerEducation !== null) prefs.minimumPartnerEducation = profile.minimumPartnerEducation;
  if (profile.acceptedPartnerSmoking.length > 0) prefs.acceptedPartnerSmoking = profile.acceptedPartnerSmoking;
  if (profile.acceptedPartnerAlcohol.length > 0) prefs.acceptedPartnerAlcohol = profile.acceptedPartnerAlcohol;
  if (profile.partnerWantsChildren !== null) prefs.partnerWantsChildren = profile.partnerWantsChildren;
  if (profile.partnerHasChildren !== null) prefs.partnerHasChildren = profile.partnerHasChildren;
  if (profile.acceptedPartnerReligions.length > 0) prefs.acceptedPartnerReligions = profile.acceptedPartnerReligions;
  if (profile.maxDistanceKm !== null) prefs.maxDistanceKm = profile.maxDistanceKm;
  if (profile.similarityPreference !== null) prefs.similarityPreference = profile.similarityPreference;

  return {
    id: profile.id,
    aboutMe: profile.aboutMe ?? undefined,
    aboutPartner: profile.aboutPartner,
    holyGrailStructuredFacts: facts,
    holyGrailStructuredPreferences: prefs,
    // Phase 2: extractionV2 not populated (ranking signals are Phase 3).
    extractionV2: null,
  };
}
