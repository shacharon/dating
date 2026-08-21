import { Inject, Injectable } from '@nestjs/common';
import type { UserProfile, UserProfileStatus } from '@prisma/client';
import type {
  EvaluateBatchInput,
  EvaluateBatchResult,
} from '../evaluate/evaluate-batch.types';
import { EvaluateService } from '../evaluate/evaluate.service';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import {
  USER_PROFILE_REPOSITORY,
  type IUserProfileRepository,
} from './repositories/user-profile.repository';

/** Max profile ids per DISTINCT ON query (keeps IN-lists bounded). */
export const LATEST_EVAL_BATCH_SIZE = 500;

const STATUS_SUBMITTED = 'SUBMITTED' as UserProfileStatus;
const STATUS_ANALYZED = 'ANALYZED' as UserProfileStatus;

/**
 * Pipeline version tag stored in every UserProfileEvaluation row.
 * Bump when the evaluation schema or scoring logic changes in a breaking way.
 */
export const EVALUATION_VERSION = 'v1';

/** Outcome of {@link MeProfileAnalysisService.runForUser} (Sprint 48 Story 1).
 * `success` also covers already-ANALYZED (idempotent Bull retry after side-effect failure).
 */
export type ProfileAnalysisRunOutcome =
  | { status: 'success' }
  | { status: 'skipped' }
  | { status: 'failed' };

/**
 * Canonical signal keys extracted from `EvaluateBatchResult` into `UserProfileSignal` rows.
 *
 * **Semantic source of truth** for profile analysis remains `UserProfileEvaluation.evaluationJson`
 * (the row created in the same `$transaction` batch as these upserts). `UserProfileSignal` is a
 * denormalized index for search/filtering.
 *
 * **Schema note:** `UserProfileSignal.evalVersion` stores the pipeline version tag
 * (`EVALUATION_VERSION`, mirrored on `UserProfileEvaluation.version`). It is **not** a foreign key
 * to `UserProfileEvaluation.id`. There is no `evaluationId` column today — proving read-side
 * alignment to a specific evaluation row would require a schema migration (do not fake linkage in
 * application code). The **write path** aligns signals to the latest run by atomically creating
 * the evaluation row, `deleteMany` for the profile, then upserting from this run's `result`.
 */
const SIGNAL_KEYS = [
  'emotionalDepth',
  'lifestylePace',
  'conflictStyle',
  'independence',
  'socialBattery',
] as const;

function toNullableSignalInt(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 10) {
    return null;
  }
  return rounded;
}

/**
 * Top interest tags from enrichment / extended / raw signals, deduped by lowercase key (max 3).
 *
 * **Semantic source of truth** for what these tags mean is `UserProfileEvaluation.evaluationJson`
 * for the evaluation row created in the same transaction as the interest rows.
 * `UserProfileInterest` rows are a denormalized index. The same tags are **written** onto
 * `UserProfile.interestsTop` via {@link mapDbFirstColumnsFromEvaluation} for DB-first search only;
 * product code under `src/me-profile/` does **not** read that column back for matching or mapping.
 *
 * **Schema note:** `UserProfileInterest.evalVersion` stores the pipeline tag (`EVALUATION_VERSION`,
 * same string as `UserProfileEvaluation.version`). It is **not** a foreign key to
 * `UserProfileEvaluation.id`. There is no `evaluationId` column — proving read-side alignment to a
 * specific evaluation row would require a schema migration (do not fake linkage in application
 * code). The **write path** replaces all interest rows for the profile in the same atomic batch as
 * the new evaluation snapshot (`deleteMany` then `create` from this run's `result`).
 */
function pickTopInterests(result: EvaluateBatchResult): string[] {
  const fromEnrichment = result.enrichment?.signals?.interestsTop3;
  const fromExtended = result.extendedSignals?.interests;
  const fromRaw = result.self?.rawInterests;
  const candidate = [fromEnrichment, fromExtended, fromRaw].find(
    (v) => Array.isArray(v) && v.length > 0,
  );
  if (!candidate) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of candidate) {
    if (typeof item !== 'string') continue;
    const normalized = item.trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * Payload fragment for **`UserProfile.update` write only** — denormalized DB-first / cache columns
 * (`interestsTop`, `sig*`) derived from the same `EvaluateBatchResult` persisted as
 * `UserProfileEvaluation.evaluationJson` in the same transaction.
 *
 * **Semantic source of truth** remains `UserProfileEvaluation.evaluationJson`. These fields exist
 * on `UserProfile` for indexing/search and parity with normalized tables; **`src/me-profile/` must
 * not read them at runtime** for engine scoring or HG mapping (use latest evaluation JSON instead).
 * This module does not substitute `UserProfileSignal` / `UserProfileInterest` for those reads here.
 *
 * (No `evaluationId` on interest rows; see {@link pickTopInterests}.)
 */
export function mapDbFirstColumnsFromEvaluation(result: EvaluateBatchResult): {
  interestsTop: string[];
  sigEmotionalDepth: number | null;
  sigLifestylePace: number | null;
  sigConflictStyle: number | null;
  sigIndependence: number | null;
  sigSocialBattery: number | null;
} {
  const selfSignals = result.self?.signals ?? {};
  return {
    interestsTop: pickTopInterests(result),
    sigEmotionalDepth: toNullableSignalInt(selfSignals.emotionalDepth),
    sigLifestylePace: toNullableSignalInt(selfSignals.lifestylePace),
    sigConflictStyle: toNullableSignalInt(selfSignals.conflictStyle),
    sigIndependence: toNullableSignalInt(selfSignals.independence),
    sigSocialBattery: toNullableSignalInt(selfSignals.socialBattery),
  };
}

/**
 * Phase C dual-write: build `UserProfileSignal` upsert operations from this run's `result`.
 * Only signals with a non-null value produce a row. Caller must pass the same `evalVersion` string
 * used for `UserProfileEvaluation.version` in the same transaction (see {@link SIGNAL_KEYS}).
 */
function buildSignalRows(
  result: EvaluateBatchResult,
  evalVersion: string,
): Array<{
  signalKey: string;
  signalValue: number;
  evalVersion: string;
}> {
  const selfSignals = (result.self?.signals ?? {}) as Record<string, unknown>;
  return SIGNAL_KEYS.flatMap((key) => {
    const value = toNullableSignalInt(selfSignals[key]);
    if (value === null) return [];
    return [{ signalKey: key, signalValue: value, evalVersion }];
  });
}

/**
 * Phase C dual-write: build `UserProfileInterest` `deleteMany` + `create` ops from this run's `result`.
 * Always removes all interest rows for the profile, then re-creates ranked rows from {@link pickTopInterests}.
 * Caller must pass the same `evalVersion` as `UserProfileEvaluation.version` in the same transaction.
 */
function buildInterestRows(
  result: EvaluateBatchResult,
  evalVersion: string,
): Array<{
  tag: string;
  rank: number;
  source: string;
  evalVersion: string;
}> {
  return pickTopInterests(result).map((tag, i) => ({
    tag: tag.toLowerCase().trim(),
    rank: i + 1,
    source: 'enrichment',
    evalVersion,
  }));
}

/**
 * Full set of UserProfile fields that constitute the analysis input.
 *
 * Text fields (aboutMe/Partner/Relationship) are consumed by the LLM pipeline
 * today. Identity fields (birthDate, gender, city, etc.) are captured here as
 * the source-of-truth snapshot so future phases (matching, ranking) can read
 * them without going back to the UserProfile row.
 */
export interface UserProfileAnalysisContext {
  /** The UserProfile.id — used as the LLM pipeline's profileId for observability. */
  profileId: string;
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
  birthDate: Date | null;
  gender: string | null;
  desiredPartnerGenders: unknown;
  city: string | null;
  country: string | null;
  locationLabel: string | null;
}

/**
 * Build an analysis context from a UserProfile row.
 * All nullable text fields default to empty string so the LLM pipeline never
 * receives null.
 */
export function buildAnalysisContext(
  profile: Pick<
    UserProfile,
    | 'id'
    | 'aboutMe'
    | 'aboutPartner'
    | 'aboutRelationship'
    | 'birthDate'
    | 'gender'
    | 'desiredPartnerGenders'
    | 'city'
    | 'country'
    | 'locationLabel'
  >,
): UserProfileAnalysisContext {
  return {
    profileId: profile.id,
    aboutMe: profile.aboutMe ?? '',
    aboutPartner: profile.aboutPartner ?? '',
    aboutRelationship: profile.aboutRelationship ?? '',
    birthDate: profile.birthDate ?? null,
    gender: profile.gender ?? null,
    desiredPartnerGenders: profile.desiredPartnerGenders,
    city: profile.city ?? null,
    country: profile.country ?? null,
    locationLabel: profile.locationLabel ?? null,
  };
}

/**
 * Map a UserProfileAnalysisContext to the EvaluateBatchInput the LLM pipeline
 * expects. Only the three text fields are consumed today; profileId is passed
 * as an observability tag.
 */
function contextToEvaluateBatchInput(
  ctx: UserProfileAnalysisContext,
): EvaluateBatchInput {
  return {
    aboutMe: ctx.aboutMe,
    aboutPartner: ctx.aboutPartner,
    aboutRelationship: ctx.aboutRelationship,
    profileId: ctx.profileId,
  };
}

/**
 * Orchestrates the analysis lifecycle for a single UserProfile.
 *
 * Allowed prior state: SUBMITTED.
 * Transitions owned here: SUBMITTED → ANALYZING → ANALYZED | FAILED.
 *
 * Designed to be called as fire-and-forget from the submit handler.
 * Does NOT write to MatchmakingProfile; UserProfile is the source of truth.
 */
@Injectable()
export class MeProfileAnalysisService {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly profiles: IUserProfileRepository,
    private readonly evaluate: EvaluateService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async runForUser(userId: string): Promise<ProfileAnalysisRunOutcome> {
    const profile = await this.profiles.findByUserId(userId);

    // Guard: skip if profile was concurrently moved away from SUBMITTED.
    // Already ANALYZED → treat as success so Bull retries after a prior attempt
    // that finished analysis but failed cache/rank side effects still enqueue rebuild.
    if (!profile) {
      this.obs.trace(
        `me profile analysis skipped: not in SUBMITTED state userId=${userId} status=none`,
        ErrorCodes.ME_PROFILE_ANALYSIS_SKIPPED,
      );
      return { status: 'skipped' };
    }
    if ((profile.status as string) === STATUS_ANALYZED) {
      this.obs.trace(
        `me profile analysis already ANALYZED userId=${userId} profileId=${profile.id}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_SKIPPED,
      );
      return { status: 'success' };
    }
    if ((profile.status as string) !== STATUS_SUBMITTED) {
      this.obs.trace(
        `me profile analysis skipped: not in SUBMITTED state userId=${userId} status=${profile.status}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_SKIPPED,
      );
      return { status: 'skipped' };
    }

    // Transition to ANALYZING.
    try {
      await this.profiles.markAnalyzing(userId);
    } catch (e: unknown) {
      this.obs.error(
        `me profile analysis failed to set ANALYZING profileId=${profile.id}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_FAILED,
        e,
      );
      return { status: 'failed' };
    }

    this.obs.trace(
      `me profile analysis started profileId=${profile.id}`,
      ErrorCodes.ME_PROFILE_ANALYSIS_START,
    );

    const ctx = buildAnalysisContext(profile);
    const input = contextToEvaluateBatchInput(ctx);

    try {
      const { result } = await this.evaluate.evaluateBatch(input);
      // Write-only denormalized columns on UserProfile (interestsTop, sig*); not read back here or in MeMatchesService / engine mapper.
      const dbFirstColumns = mapDbFirstColumnsFromEvaluation(result);

      // Atomic write: ANALYZED profile + new UserProfileEvaluation row + normalized signals/interests.
      // Order: evaluation snapshot is created before signal/interest writes; signals and interests
      // are wiped then repopulated from `result` so they match this batch's evaluation JSON
      // (`UserProfileSignal` / `UserProfileInterest` have evalVersion only — no evaluationId FK; see SIGNAL_KEYS and pickTopInterests).
      // If any operation fails the catch block fires and sets FAILED.
      await this.profiles.persistAnalysisSuccess({
        userId,
        profileId: profile.id,
        dbFirstColumns,
        evaluationVersion: EVALUATION_VERSION,
        evaluationJson: result,
        signals: buildSignalRows(result, EVALUATION_VERSION),
        interests: buildInterestRows(result, EVALUATION_VERSION),
      });

      this.obs.trace(
        `me profile analysis complete profileId=${profile.id}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_SUCCESS,
      );
      return { status: 'success' };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);

      // Best-effort: persist FAILED status. Do not throw if this update also
      // fails — the caller uses fire-and-forget.
      await this.profiles
        .markAnalysisFailed(userId, message)
        .catch(() => undefined);

      this.obs.error(
        `me profile analysis failed profileId=${profile.id}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_FAILED,
        e,
      );
      return { status: 'failed' };
    }
  }
}
