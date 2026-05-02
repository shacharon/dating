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
 * Minimal shape of a UserProfilePreference row needed by the HG mapper.
 * Structurally compatible with the Prisma-generated UserProfilePreference type;
 * extra columns on the DB type (id, profileId, updatedAt) are ignored.
 */
export interface UserProfilePreferenceRow {
  readonly partnerAgeMin: number | null;
  readonly partnerAgeMax: number | null;
  readonly maxDistanceKm: number | null;
  readonly minimumPartnerEducation: string | null;
  readonly acceptedPartnerGenders: string[];
  readonly acceptedPartnerSmoking: string[];
  readonly acceptedPartnerAlcohol: string[];
  readonly acceptedPartnerReligions: string[];
  readonly partnerWantsChildren: string | null;
  readonly partnerHasChildren: string | null;
  readonly similarityPreference: string | null;
}

/**
 * UserProfile fields required to build a ChildrenUnsureProfileRow for HG Layer-3
 * hard-eligibility evaluation. All HG columns are optional (null = not set → SKIPPED).
 * extractionV2 is not populated in Phase 2 (only hard eligibility is needed; ranking
 * signals are a Phase 3 concern).
 *
 * Phase F: optional `preference` is the joined `UserProfilePreference` row.
 * When missing or empty, HG preference scalars/arrays are omitted (lenient SKIP)
 * except partner genders, which are still parsed from `desiredPartnerGenders` JSON.
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
  readonly preference?: UserProfilePreferenceRow | null;
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

/** Reason the mapper did not use a populated normalized preference row. */
export type HgPreferenceFallbackReason = 'missing_row' | 'missing_fields';

/**
 * Return type of buildChildrenUnsureRowFromNewModel.
 * `fallback` is non-null when `UserProfilePreference` is absent or empty (no scalar/array prefs),
 * which callers can log as the `hg_preference_fallback_used` event.
 */
export interface BuildHgRowResult {
  readonly row: ChildrenUnsureProfileRow;
  readonly fallback: { readonly reason: HgPreferenceFallbackReason } | null;
}

/** Returns true when every preference field on the row is null / empty-array. */
function isPrefRowEmpty(pref: UserProfilePreferenceRow): boolean {
  return (
    pref.partnerAgeMin === null &&
    pref.partnerAgeMax === null &&
    pref.maxDistanceKm === null &&
    pref.minimumPartnerEducation === null &&
    pref.acceptedPartnerGenders.length === 0 &&
    pref.acceptedPartnerSmoking.length === 0 &&
    pref.acceptedPartnerAlcohol.length === 0 &&
    pref.acceptedPartnerReligions.length === 0 &&
    pref.partnerWantsChildren === null &&
    pref.partnerHasChildren === null &&
    pref.similarityPreference === null
  );
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
 *
 * Phase E/F observability: returns a `fallback` descriptor when the normalized
 * `UserProfilePreference` row is absent or has no preference payload.
 */
export function buildChildrenUnsureRowFromNewModel(
  profile: ProfileHgSource,
): BuildHgRowResult {
  const normPref = profile.preference ?? null;
  const useNormalizedPrefs =
    normPref !== null && !isPrefRowEmpty(normPref);

  // Determine fallback state before building the row so callers can emit the event.
  const fallback: BuildHgRowResult['fallback'] =
    normPref === null
      ? { reason: 'missing_row' }
      : isPrefRowEmpty(normPref)
        ? { reason: 'missing_fields' }
        : null;

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

  // Gender: normalized acceptedPartnerGenders when row is populated; else JSON on UserProfile.
  if (useNormalizedPrefs) {
    if (normPref!.acceptedPartnerGenders.length > 0) {
      prefs.acceptedPartnerGenders = normPref!.acceptedPartnerGenders;
    }
  } else {
    const acceptedGenders = parseAcceptedPartnerGendersFromProductJson(
      profile.desiredPartnerGenders,
    );
    if (acceptedGenders !== null && acceptedGenders.length > 0) {
      prefs.acceptedPartnerGenders = acceptedGenders;
    }
  }

  const ageMin = useNormalizedPrefs ? normPref!.partnerAgeMin : null;
  const ageMax = useNormalizedPrefs ? normPref!.partnerAgeMax : null;
  const distKm = useNormalizedPrefs ? normPref!.maxDistanceKm : null;
  const minEdu = useNormalizedPrefs ? normPref!.minimumPartnerEducation : null;
  const partnerWantsChildren = useNormalizedPrefs
    ? normPref!.partnerWantsChildren
    : null;
  const partnerHasChildren = useNormalizedPrefs ? normPref!.partnerHasChildren : null;
  const similarityPreference = useNormalizedPrefs
    ? normPref!.similarityPreference
    : null;

  if (ageMin !== null) prefs.partnerAgeMin = ageMin;
  if (ageMax !== null) prefs.partnerAgeMax = ageMax;
  if (distKm !== null) prefs.maxDistanceKm = distKm;
  if (minEdu !== null) prefs.minimumPartnerEducation = minEdu;
  if (partnerWantsChildren !== null) prefs.partnerWantsChildren = partnerWantsChildren;
  if (partnerHasChildren !== null) prefs.partnerHasChildren = partnerHasChildren;
  if (similarityPreference !== null) prefs.similarityPreference = similarityPreference;

  const smoking = useNormalizedPrefs ? normPref!.acceptedPartnerSmoking : [];
  const alcohol = useNormalizedPrefs ? normPref!.acceptedPartnerAlcohol : [];
  const religions = useNormalizedPrefs ? normPref!.acceptedPartnerReligions : [];

  if (smoking.length > 0) prefs.acceptedPartnerSmoking = smoking;
  if (alcohol.length > 0) prefs.acceptedPartnerAlcohol = alcohol;
  if (religions.length > 0) prefs.acceptedPartnerReligions = religions;

  return {
    row: {
      id: profile.id,
      aboutMe: profile.aboutMe ?? undefined,
      aboutPartner: profile.aboutPartner,
      holyGrailStructuredFacts: facts,
      holyGrailStructuredPreferences: prefs,
      // Phase 2: extractionV2 not populated (ranking signals are Phase 3).
      extractionV2: null,
    },
    fallback,
  };
}
