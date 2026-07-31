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
 *
 * **`UserProfile.interestsTop` and `sig*` columns are intentionally unused here** — they are
 * write-only denormalized cache on the profile row.
 *
 * **Engine input sources**: the assembler merges signals/interests from normalized tables
 * (`UserProfileSignal` / `UserProfileInterest`) onto `evaluationJson` when **every** normalized
 * row's `evalVersion` equals the latest evaluation's `version` (all-or-nothing per participant).
 * Otherwise the blob alone is used. The raw `evaluationJson` is always the fallback.
 *
 * **`buildMeMatchesParticipantReadModel`** is the single composition point for `/api/v1/me/matches`:
 * it takes `UserProfile` (HG slice), `UserProfilePreference`, latest `UserProfileEvaluation`,
 * and optional normalized rows, then returns both the match-engine payload and HG row.
 *
 * **`MeMatchesService` must import only this builder** from this module — not
 * {@link buildProfilePayloadFromNewModel} or {@link buildChildrenUnsureRowFromNewModel} directly;
 * those remain internal building blocks for the read model.
 */

import type { Prisma, UserProfileEvaluation } from '@prisma/client';
import type { ChildrenUnsureProfileRow } from '../matches/children-unsure-profile-row.types';
import type { EvaluateBatchResult } from '../evaluate/evaluate-batch.types';
import type { EnrichmentV1 } from '../evaluate/enrichment-signals';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import { parseAcceptedPartnerGendersFromProductJson } from './user-profile-matching-bridge.contract';

// ─── Normalized row types ─────────────────────────────────────────────────────

/** One row from `UserProfileSignal` — only the columns consumed by the assembler. */
export interface NormalizedSignalRow {
  readonly signalKey: string;
  readonly signalValue: number;
  /** Pipeline tag; must match latest `UserProfileEvaluation.version` for merge. */
  readonly evalVersion: string;
}

/** One row from `UserProfileInterest` — only the columns consumed by the assembler. */
export interface NormalizedInterestRow {
  readonly tag: string;
  readonly rank: number;
  /** Pipeline tag; must match latest `UserProfileEvaluation.version` for merge. */
  readonly evalVersion: string;
}

/**
 * Whether {@link assembleEvaluationPayload} will apply normalized overlays (not merely return
 * the blob unchanged). Requires non-empty row set and every row's `evalVersion` equals
 * `evaluationVersion`.
 */
export function meMatchesEngineNormalizedMergeActive(
  signals: readonly NormalizedSignalRow[],
  interests: readonly NormalizedInterestRow[],
  evaluationVersion: string,
): boolean {
  if (signals.length === 0 && interests.length === 0) {
    return false;
  }
  return (
    signals.every((s) => s.evalVersion === evaluationVersion) &&
    interests.every((i) => i.evalVersion === evaluationVersion)
  );
}

export type MeMatchesEngineInputSourceMode = 'evaluationJson' | 'normalized';

export function resolveMeMatchesEngineInputSourceMode(
  signals: readonly NormalizedSignalRow[],
  interests: readonly NormalizedInterestRow[],
  evaluationVersion: string,
): MeMatchesEngineInputSourceMode {
  return meMatchesEngineNormalizedMergeActive(
    signals,
    interests,
    evaluationVersion,
  )
    ? 'normalized'
    : 'evaluationJson';
}

/**
 * Merges normalized signal/interest rows onto top of `evaluationJson`.
 *
 * When both arrays are empty the original blob is returned unchanged.
 *
 * Overrides applied when every normalized row's `evalVersion` equals `evaluationVersion`
 * (otherwise the blob is returned unchanged — all-or-nothing).
 * - `self.signals`: each `signalKey` in the normalized rows replaces the matching key.
 * - `enrichment.signals.interestsTop3`: replaced with the top-3 tags (rows must arrive
 *   ordered by `rank ASC`; only the first three are used).
 *
 * All other fields (`partner`, `relationship`, `compatibility`, `display`, `productScores`, …)
 * are left untouched — scoring logic is not modified.
 */
export function assembleEvaluationPayload(
  evaluationJson: Prisma.JsonValue,
  signals: readonly NormalizedSignalRow[],
  interests: readonly NormalizedInterestRow[],
  evaluationVersion: string,
): EvaluateBatchResult {
  const base = evaluationJson as unknown as EvaluateBatchResult;

  if (
    !meMatchesEngineNormalizedMergeActive(
      signals,
      interests,
      evaluationVersion,
    )
  ) {
    return base;
  }

  let result: EvaluateBatchResult = base;

  if (signals.length > 0) {
    const normalizedSignals: Record<string, number | null> = {};
    for (const s of signals) {
      normalizedSignals[s.signalKey] = s.signalValue;
    }
    result = {
      ...result,
      self: {
        ...base.self,
        signals: {
          ...(base.self?.signals ?? {}),
          ...normalizedSignals,
        },
      },
    };
  }

  if (interests.length > 0) {
    const top3 = interests.slice(0, 3).map((i) => i.tag);
    const baseEnrichment = result.enrichment;
    const mergedEnrichment: EnrichmentV1 = {
      version: 'v1',
      ...baseEnrichment,
      signals: {
        dailyRhythm: null,
        autonomyTogethernessDepth: null,
        kidsTimeline: null,
        conflictStyleDetail: null,
        relationshipPace: null,
        communicationMode: null,
        ...baseEnrichment?.signals,
        interestsTop3: top3,
      },
    };
    result = { ...result, enrichment: mergedEnrichment };
  }

  return result;
}

// ─── Profile source shapes ────────────────────────────────────────────────────

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
  readonly acceptedPartnerGenders: string[];
}

/**
 * UserProfile fields required to build a ChildrenUnsureProfileRow for HG Layer-3
 * hard-eligibility evaluation. All HG columns are optional (null = not set → SKIPPED).
 * extractionV2 is not populated in Phase 2 (only hard eligibility is needed; ranking
 * signals are a Phase 3 concern).
 *
 * Phase F: optional `preference` is the joined `UserProfilePreference` row.
 * When missing or empty, HG preference scalars/arrays are omitted (lenient SKIP).
 * Partner genders: when a preference row exists, `acceptedPartnerGenders` on that row is the
 * sole read source for `/api/v1/me/matches` HG mapping; `UserProfile.desiredPartnerGenders` JSON
 * is used only when there is no preference row (legacy).
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
 * Maps a UserProfile row slice + a `UserProfileEvaluation` row to the ProfileJsonPayload
 * shape consumed by compareWithStatus (match engine).
 *
 * `evaluation` must be the **latest** row for this profile only (same row as
 * {@link latestEvaluationForProfile}: `ORDER BY createdAt DESC LIMIT 1`). Do not pass older
 * evaluations or merged payloads.
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

/**
 * `UserProfile` fields required for `/api/v1/me/matches` read-model assembly, **without** embedded
 * `preference` (supplied as a separate argument to {@link buildMeMatchesParticipantReadModel}).
 */
export type MeMatchesReadModelProfileInput = Omit<ProfileHgSource, 'preference'>;

/**
 * Single read model for one participant (viewer or candidate) on `/api/v1/me/matches`.
 * Built only from `UserProfile` + `UserProfilePreference` + latest `UserProfileEvaluation`.
 *
 * - {@link MeMatchesParticipantReadModel.enginePayload} → `compareWithStatus` (semantic SOT: `evaluationJson`).
 * - {@link MeMatchesParticipantReadModel.hg} → `evaluateHolyGrailPairDirections` (`hg.row`).
 * - {@link MeMatchesParticipantReadModel.evaluationDisplaySummary} — optional UI headline parsed inside this module only.
 */
export interface MeMatchesParticipantReadModel {
  readonly enginePayload: ProfileJsonPayload;
  readonly hg: BuildHgRowResult;
  /** `display.summary` from the evaluation blob; null when absent. Not exposed on list DTO. */
  readonly evaluationDisplaySummary: string | null;
}

/** Returns true when every preference field on the row is null / empty-array. */
function isPrefRowEmpty(pref: UserProfilePreferenceRow): boolean {
  return (
    pref.partnerAgeMin === null &&
    pref.partnerAgeMax === null &&
    pref.maxDistanceKm === null &&
    pref.acceptedPartnerGenders.length === 0
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

  // Partner genders: UserProfilePreference row is read SOT when present (even if other pref
  // fields are empty). Legacy: no preference row → parse `UserProfile.desiredPartnerGenders` JSON.
  if (normPref !== null) {
    if (normPref.acceptedPartnerGenders.length > 0) {
      prefs.acceptedPartnerGenders = normPref.acceptedPartnerGenders;
    }
  } else {
    // Legacy — no UserProfilePreference row; mirror product JSON until backfill guarantees a row.
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

  if (ageMin !== null) prefs.partnerAgeMin = ageMin;
  if (ageMax !== null) prefs.partnerAgeMax = ageMax;
  if (distKm !== null) prefs.maxDistanceKm = distKm;

  return {
    row: {
      id: profile.id,
      aboutMe: profile.aboutMe ?? undefined,
      aboutPartner: profile.aboutPartner,
      aboutRelationship: profile.aboutRelationship,
      holyGrailStructuredFacts: facts,
      holyGrailStructuredPreferences: prefs,
      // Phase 2: extractionV2 not populated (ranking signals are Phase 3).
      extractionV2: null,
    },
    fallback,
  };
}

function parseEvaluationDisplaySummaryFromEvaluationBlob(
  blob: Pick<UserProfileEvaluation, 'evaluationJson'>['evaluationJson'],
): string | null {
  if (blob !== null && typeof blob === 'object' && 'display' in blob) {
    const display = (blob as Record<string, unknown>)['display'];
    if (
      display !== null &&
      typeof display === 'object' &&
      'summary' in display &&
      typeof (display as Record<string, unknown>)['summary'] === 'string'
    ) {
      return (display as Record<string, unknown>)['summary'] as string;
    }
  }
  return null;
}

/**
 * Assembles all **match-engine** and **HG Layer-3** inputs for one profile on the active
 * `/api/v1/me/matches` path. Callers load latest `UserProfileEvaluation` separately
 * ({@link latestEvaluationForProfile} / batch map); this function performs no I/O.
 *
 * @param profile — `UserProfile` row slice for engine texts + HG facts/prefs, **excluding** `preference`.
 * @param preference — joined `UserProfilePreference` row or null (HG partner genders + scalars).
 * @param evaluation — latest `UserProfileEvaluation` for `profile.id` (`evaluationJson` is semantic SOT for the engine).
 * @param normalizedRows — optional normalized signal/interest rows; when present the assembler
 *   merges them onto `evaluationJson` when `evalVersion` matches `evaluation.version`.
 */
export function buildMeMatchesParticipantReadModel(
  profile: MeMatchesReadModelProfileInput,
  preference: UserProfilePreferenceRow | null | undefined,
  evaluation: Pick<UserProfileEvaluation, 'createdAt' | 'evaluationJson' | 'version'>,
  normalizedRows?: {
    signals: readonly NormalizedSignalRow[];
    interests: readonly NormalizedInterestRow[];
  },
): MeMatchesParticipantReadModel {
  const profileHg: ProfileHgSource = {
    ...profile,
    preference: preference ?? undefined,
  };

  const effectiveEvaluation =
    normalizedRows !== undefined
      ? {
          ...evaluation,
          evaluationJson: assembleEvaluationPayload(
            evaluation.evaluationJson,
            normalizedRows.signals,
            normalizedRows.interests,
            evaluation.version,
          ) as unknown as Prisma.JsonValue,
        }
      : evaluation;

  return {
    enginePayload: buildProfilePayloadFromNewModel(profile, effectiveEvaluation),
    hg: buildChildrenUnsureRowFromNewModel(profileHg),
    // Display summary always comes from the raw stored blob — never overridden by normalized rows.
    evaluationDisplaySummary: parseEvaluationDisplaySummaryFromEvaluationBlob(
      evaluation.evaluationJson,
    ),
  };
}
