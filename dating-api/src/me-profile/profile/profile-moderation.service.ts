import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ErrorCodes } from '../../logging/error-codes';
import { markHttpExceptionObservabilityLogged } from '../../logging/observability-http.exception';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { OpenAIModerationClient } from '../../content-moderation/openai-moderation.client';
import { ContentViolationService } from '../../content-moderation/content-violation.service';
import {
  datingPolicySexualScoreMin,
  type ContentViolationSurface,
} from '../../content-moderation/content-moderation.types';
import {
  evaluateContentPolicy,
  isDatingPolicyNearMiss,
} from '../../content-moderation/dating-policy';
import { buildModerationUserFacingDetails } from '../../content-moderation/moderation-user-facing';
import type { CreateMeProfileDto, PatchMeProfileDto } from '../me-profile.dto';

/** Content-moderation gates applied before profile create/patch writes. */
@Injectable()
export class ProfileModerationService {
  constructor(
    private readonly obs: StructuredObservabilityService,
    private readonly moderation: OpenAIModerationClient,
    private readonly contentViolations: ContentViolationService,
  ) {}

  async assertProfileEditAllowed(userId: string): Promise<void> {
    if (!(await this.contentViolations.isUserBlocked(userId, 'profile'))) {
      return;
    }
    this.obs.trace(
      `profile edit blocked userId=${userId}`,
      ErrorCodes.CONTENT_PROFILE_EDIT_BLOCKED,
    );
    const ex = new ForbiddenException({
      error: 'profile_edit_blocked',
      message:
        'Profile editing is currently restricted due to previous content violations',
    });
    markHttpExceptionObservabilityLogged(ex);
    throw ex;
  }

  async moderateProfileTextFields(
    userId: string,
    body: Pick<
      CreateMeProfileDto | PatchMeProfileDto,
      'aboutMe' | 'aboutPartner' | 'aboutRelationship'
    >,
  ): Promise<void> {
    const fields: Array<{
      field: 'aboutMe' | 'aboutPartner' | 'aboutRelationship';
      surface: ContentViolationSurface;
      value: string | null | undefined;
    }> = [
      {
        field: 'aboutMe',
        surface: 'profile_aboutMe',
        value: body.aboutMe,
      },
      {
        field: 'aboutPartner',
        surface: 'profile_aboutPartner',
        value: body.aboutPartner,
      },
      {
        field: 'aboutRelationship',
        surface: 'profile_aboutRelationship',
        value: body.aboutRelationship,
      },
    ];

    for (const { field, surface, value } of fields) {
      if (value === undefined || value === null) continue;
      const trimmed = value.trim();
      if (!trimmed) continue;

      const moderation = await this.moderation.checkContent(trimmed);
      const decision = evaluateContentPolicy(trimmed, moderation);

      if (decision.allow) {
        if (isDatingPolicyNearMiss(trimmed, moderation)) {
          this.obs.trace(
            `content moderation near-miss sexualScore=${moderation.sexualScore} threshold=${datingPolicySexualScoreMin()} surface=${surface}`,
            ErrorCodes.CONTENT_MODERATION_NEAR_MISS,
          );
        }
        continue;
      }

      await this.contentViolations.recordViolation({
        userId,
        surface,
        flaggedText: trimmed,
        category: decision.category,
        score: decision.score,
        action: decision.action,
      });

      if (decision.source === 'openai') {
        this.obs.trace(
          `content moderation flagged userId=${userId} field=${field} category=${decision.category}`,
          ErrorCodes.CONTENT_MODERATION_FLAGGED,
        );
      } else {
        this.obs.trace(
          `content moderation dating-policy userId=${userId} field=${field} source=${decision.source} category=${decision.category}`,
          ErrorCodes.CONTENT_MODERATION_DATING_POLICY,
        );
      }

      await this.contentViolations.enforceViolationThreshold(userId, 'profile');

      const userFacing = buildModerationUserFacingDetails({
        text: trimmed,
        decision,
        surface: 'profile',
      });

      const ex = new BadRequestException({
        error: 'content_moderation_failed',
        message: 'Your profile contains inappropriate content',
        details: {
          field,
          category: decision.category,
          source: decision.source,
          ...userFacing,
        },
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }
}
