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

      // Atomic write: status transition + evaluation snapshot land together.
      // If either fails the catch block fires and sets FAILED.
      await this.prisma.$transaction([
        this.prisma.userProfile.update({
          where: { userId },
          data: {
            status: STATUS_ANALYZED,
            analyzedAt: new Date(),
            lastAnalysisError: null,
          },
        }),
        this.prisma.userProfileEvaluation.create({
          data: {
            profileId: profile.id,
            version: EVALUATION_VERSION,
            evaluationJson: result as unknown as Prisma.InputJsonValue,
          },
        }),
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
