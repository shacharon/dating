import { Injectable } from '@nestjs/common';
import type { Prisma, UserProfile, UserProfileStatus } from '@prisma/client';
import type {
  EvaluateBatchInput,
  EvaluateBatchResult,
} from '../evaluate/evaluate-batch.types';
import { EvaluateService } from '../evaluate/evaluate.service';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';

const STATUS_SUBMITTED = 'SUBMITTED' as UserProfileStatus;
const STATUS_ANALYZING = 'ANALYZING' as UserProfileStatus;
const STATUS_ANALYZED = 'ANALYZED' as UserProfileStatus;
const STATUS_FAILED = 'FAILED' as UserProfileStatus;

/**
 * Pipeline version tag stored in every UserProfileEvaluation row.
 * Bump when the evaluation schema or scoring logic changes in a breaking way.
 */
export const EVALUATION_VERSION = 'v1';

/** Canonical signal keys extracted from evaluationJson into UserProfileSignal rows. */
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

function pickTopInterests(result: EvaluateBatchResult): string[] {
  const fromEnrichment = result.enrichment?.signals?.interestsTop3;
  const fromExtended = result.extendedSignals?.interests;
  const fromRaw = result.self?.rawInterests;
  const candidate = [fromEnrichment, fromExtended, fromRaw].find((v) =>
    Array.isArray(v) && v.length > 0,
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
    out.push(normalized);
    if (out.length >= 3) break;
  }
  return out;
}

/**
 * Derive additive DB-first searchable columns from EvaluateBatchResult.
 * Source-of-truth remains `UserProfileEvaluation.evaluationJson`.
 *
 * `interestsTop` on `UserProfile` is a denormalized search copy produced by the same
 * `pickTopInterests` pipeline as `UserProfileInterest` rows — not a second semantic source.
 */
export function mapDbFirstColumnsFromEvaluation(
  result: EvaluateBatchResult,
): {
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
 * Phase C dual-write: build UserProfileSignal upsert operations from evaluation result.
 * Only signals with a non-null value produce a row.
 */
function buildSignalUpserts(
  prisma: PrismaService,
  profileId: string,
  result: EvaluateBatchResult,
  evalVersion: string,
) {
  const selfSignals = (result.self?.signals ?? {}) as Record<string, unknown>;
  return SIGNAL_KEYS.flatMap((key) => {
    const value = toNullableSignalInt(selfSignals[key]);
    if (value === null) return [];
    return [
      prisma.userProfileSignal.upsert({
        where: { profileId_signalKey: { profileId, signalKey: key } },
        create: { profileId, signalKey: key, signalValue: value, evalVersion },
        update: { signalValue: value, evalVersion },
      }),
    ];
  });
}

/**
 * Phase C dual-write: build UserProfileInterest operations from evaluation result.
 * Always deletes existing interests for the profile, then re-creates ranked rows.
 */
function buildInterestOperations(
  prisma: PrismaService,
  profileId: string,
  result: EvaluateBatchResult,
  evalVersion: string,
) {
  const tags = pickTopInterests(result);
  return [
    prisma.userProfileInterest.deleteMany({ where: { profileId } }),
    ...tags.map((tag, i) =>
      prisma.userProfileInterest.create({
        data: {
          profileId,
          tag: tag.toLowerCase().trim(),
          rank: i + 1,
          source: 'enrichment',
          evalVersion,
        },
      }),
    ),
  ];
}

/**
 * Latest-evaluation retrieval rule.
 * Always use this instead of a bare findFirst to ensure consistent ordering.
 */
export function latestEvaluationForProfile(
  prisma: PrismaService,
  profileId: string,
) {
  return prisma.userProfileEvaluation.findFirst({
    where: { profileId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Payload shape used by `MeMatchesService` when batch-loading latest evals. */
export type LatestEvaluationForMatchPick = {
  profileId: string;
  evaluationJson: Prisma.JsonValue;
  createdAt: Date;
};

/**
 * Latest `UserProfileEvaluation` per profile (same rule as `latestEvaluationForProfile`,
 * but one query for many ids). Iteration order is DESC by `createdAt`, so the first
 * row seen for each `profileId` is the latest.
 */
export async function latestEvaluationsForProfileIds(
  prisma: PrismaService,
  profileIds: string[],
): Promise<Map<string, LatestEvaluationForMatchPick>> {
  const out = new Map<string, LatestEvaluationForMatchPick>();
  if (profileIds.length === 0) {
    return out;
  }
  const rows = await prisma.userProfileEvaluation.findMany({
    where: { profileId: { in: profileIds } },
    orderBy: { createdAt: 'desc' },
    select: { profileId: true, evaluationJson: true, createdAt: true },
  });
  for (const row of rows) {
    if (!out.has(row.profileId)) {
      out.set(row.profileId, row);
    }
  }
  return out;
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
    private readonly prisma: PrismaService,
    private readonly evaluate: EvaluateService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async runForUser(userId: string): Promise<void> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    // Guard: skip if profile was concurrently moved away from SUBMITTED.
    if (!profile || (profile.status as string) !== STATUS_SUBMITTED) {
      this.obs.trace(
        `me profile analysis skipped: not in SUBMITTED state userId=${userId} status=${profile?.status ?? 'none'}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_SKIPPED,
      );
      return;
    }

    // Transition to ANALYZING.
    try {
      await this.prisma.userProfile.update({
        where: { userId },
        data: { status: STATUS_ANALYZING },
      });
    } catch (e: unknown) {
      this.obs.error(
        `me profile analysis failed to set ANALYZING profileId=${profile.id}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_FAILED,
        e,
      );
      return;
    }

    this.obs.trace(
      `me profile analysis started profileId=${profile.id}`,
      ErrorCodes.ME_PROFILE_ANALYSIS_START,
    );

    const ctx = buildAnalysisContext(profile);
    const input = contextToEvaluateBatchInput(ctx);

    try {
      const { result } = await this.evaluate.evaluateBatch(input);
      const dbFirstColumns = mapDbFirstColumnsFromEvaluation(result);

      // Atomic write: status transition + evaluation snapshot + normalized signal/interest rows.
      // If any operation fails the catch block fires and sets FAILED.
      await this.prisma.$transaction([
        this.prisma.userProfile.update({
          where: { userId },
          data: {
            status: STATUS_ANALYZED,
            analyzedAt: new Date(),
            lastAnalysisError: null,
            ...dbFirstColumns,
          },
        }),
        this.prisma.userProfileEvaluation.create({
          data: {
            profileId: profile.id,
            version: EVALUATION_VERSION,
            evaluationJson: result as unknown as Prisma.InputJsonValue,
          },
        }),
        // Drop prior signal rows so keys absent from this run cannot linger (evalVersion is pipeline tag, not run id).
        this.prisma.userProfileSignal.deleteMany({
          where: { profileId: profile.id },
        }),
        ...buildSignalUpserts(this.prisma, profile.id, result, EVALUATION_VERSION),
        ...buildInterestOperations(this.prisma, profile.id, result, EVALUATION_VERSION),
      ]);

      this.obs.trace(
        `me profile analysis complete profileId=${profile.id}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_SUCCESS,
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);

      // Best-effort: persist FAILED status. Do not throw if this update also
      // fails — the caller uses fire-and-forget.
      await this.prisma.userProfile
        .update({
          where: { userId },
          data: {
            status: STATUS_FAILED,
            lastAnalysisError: message.slice(0, 500),
          },
        })
        .catch(() => undefined);

      this.obs.error(
        `me profile analysis failed profileId=${profile.id}`,
        ErrorCodes.ME_PROFILE_ANALYSIS_FAILED,
        e,
      );
    }
  }
}
