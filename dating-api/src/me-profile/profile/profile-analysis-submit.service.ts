import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProfileGender, UserProfileStatus } from '@prisma/client';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { ErrorCodes } from '../../logging/error-codes';
import { markHttpExceptionObservabilityLogged } from '../../logging/observability-http.exception';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileAnalysisQueueService } from '../../workers/profile-analysis.worker';
import type { MeLatestAnalysisResponseDto } from '../me-profile.dto';
import { latestEvaluationForProfile } from '../me-profile-analysis.service';
import { viewerHasApprovedPhoto } from '../me-profile-photo-gate';
import {
  mapProfileStatusToAnalysisApi,
  type AnalysisStatusResponseDto,
} from '../dto/analysis-status-response.dto';
import { MeMatchesService } from '../me-matches.service';
import {
  USER_PROFILE_REPOSITORY,
  type IUserProfileRepository,
} from '../repositories/user-profile.repository';
import type { MeProfileSubmitResponseDto } from './me-profile-submit.dto';
import { SUBMITTABLE_STATUSES, toResponse } from './profile-write.helpers';

/**
 * Submit-for-analysis path plus analysis status / latest evaluation reads.
 * This is the request-side entry point — the LLM runner is `MeProfileAnalysisService`.
 */
@Injectable()
export class ProfileAnalysisSubmitService {
  constructor(
    @Inject(USER_PROFILE_REPOSITORY)
    private readonly profiles: IUserProfileRepository,
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    private readonly analysisQueue: ProfileAnalysisQueueService,
    private readonly meMatches: MeMatchesService,
  ) {}

  /**
   * Transitions the profile to SUBMITTED and enqueues Bull analysis (or inline fallback).
   *
   * Allowed prior states: DRAFT, ANALYZED, FAILED.
   * Rejected prior states: SUBMITTED (already pending), ANALYZING (in flight).
   */
  async submitForUser(userId: string): Promise<MeProfileSubmitResponseDto> {
    const existing = await this.profiles.findByUserId(userId);

    if (!existing) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account. Use POST /api/v1/me/profile to create one.',
      });
    }

    if (!SUBMITTABLE_STATUSES.has(existing.status as string)) {
      this.obs.error(
        `me profile submit rejected: invalid state ${existing.status} profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_SUBMIT_INVALID_STATE,
      );
      const ex = new UnprocessableEntityException({
        error: 'invalid_submit_state',
        currentStatus: existing.status,
        allowedStatuses: [...SUBMITTABLE_STATUSES],
        message: `Profile cannot be submitted from status "${existing.status}". Allowed: ${[...SUBMITTABLE_STATUSES].join(', ')}.`,
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }

    if (
      !existing.gender ||
      existing.gender === ProfileGender.PREFER_NOT_TO_SAY
    ) {
      this.obs.error(
        `me profile submit rejected: gender not chosen profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_SUBMIT_INVALID_STATE,
      );
      const ex = new UnprocessableEntityException({
        error: 'gender_required',
        message:
          'Choose a gender (other than prefer-not-to-say) before submitting the profile for analysis.',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }

    if (!(await viewerHasApprovedPhoto(this.prisma, existing.id))) {
      this.obs.error(
        `me profile submit rejected: no approved photo profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_PHOTO_REQUIRED,
      );
      this.analytics.track(userId, ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED, {
        surface: 'submit',
      });
      const ex = new UnprocessableEntityException({
        error: 'photo_required',
        message:
          'Upload at least one approved photo before submitting for analysis.',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }

    try {
      const row = await this.profiles.updateByUserId(userId, {
        status: UserProfileStatus.SUBMITTED,
        submittedAt: new Date(),
        lastAnalysisError: null,
      });
      this.obs.trace(
        `me profile submitted profileId=${row.id}`,
        ErrorCodes.ME_PROFILE_SUBMIT_SUCCESS,
      );
      this.analytics.track(userId, ProductAnalyticsEvents.PROFILE_SUBMITTED, {
        profileId: row.id,
        priorStatus: existing.status as string,
      });

      await this.meMatches.invalidateMatchListCache(userId);

      const analysisJobId = await this.analysisQueue.enqueueOrRunInline({
        userId,
        profileId: row.id,
      });

      const full = await this.profiles.findByUserIdWithPreference(userId);
      if (!full) {
        const ex = new InternalServerErrorException({
          message: 'Profile could not be loaded after submit',
        });
        markHttpExceptionObservabilityLogged(ex);
        throw ex;
      }
      return {
        analysisJobId,
        profile: toResponse(full, full.preference),
      };
    } catch (e: unknown) {
      if (
        e instanceof NotFoundException ||
        e instanceof UnprocessableEntityException ||
        e instanceof InternalServerErrorException
      ) {
        throw e;
      }
      this.obs.error(
        'me profile submit persistence failed',
        ErrorCodes.ME_PROFILE_SUBMIT_FAILED,
        e,
      );
      const ex = new InternalServerErrorException({
        message: 'Profile could not be submitted',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }

  async getAnalysisStatusForUser(
    userId: string,
  ): Promise<AnalysisStatusResponseDto> {
    const row = await this.profiles.findAnalysisStatusFieldsByUserId(userId);
    if (!row) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message: 'No profile exists for this account.',
      });
    }
    const status = mapProfileStatusToAnalysisApi(row.status);
    return {
      status,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      completedAt:
        row.status === UserProfileStatus.ANALYZED
          ? (row.analyzedAt?.toISOString() ?? null)
          : null,
      error:
        row.status === UserProfileStatus.FAILED
          ? (row.lastAnalysisError ?? null)
          : null,
      profileStatus: row.status,
    };
  }

  /**
   * Latest `UserProfileEvaluation` for the current user's product profile only.
   * Does not read legacy MatchmakingProfile / ProfileEvaluation.
   */
  async getLatestAnalysisForUser(
    userId: string,
  ): Promise<MeLatestAnalysisResponseDto> {
    const profile = await this.profiles.findByUserId(userId);
    if (!profile) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account yet. Use POST /api/v1/me/profile to create one.',
      });
    }

    const latest = await latestEvaluationForProfile(this.prisma, profile.id);

    if (!latest) {
      throw new NotFoundException({
        error: 'evaluation_not_found',
        message:
          'No analysis result exists for this profile yet. Submit your profile for analysis first.',
      });
    }

    this.obs.trace(
      `me profile latest analysis profileId=${profile.id} evaluationId=${latest.id}`,
      ErrorCodes.ME_PROFILE_ANALYSIS_LATEST_OK,
    );

    return {
      userProfileId: profile.id,
      evaluationId: latest.id,
      createdAt: latest.createdAt.toISOString(),
      evaluationJson: latest.evaluationJson,
    };
  }
}
