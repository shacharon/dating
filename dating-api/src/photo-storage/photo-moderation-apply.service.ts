import { Inject, Injectable, Logger } from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PhotoRejectionEmailService } from '../notifications/photo-rejection-email.service';
import {
  PROFILE_PHOTO_REPOSITORY,
  type IProfilePhotoRepository,
} from '../me-profile/repositories/profile-photo.repository';
import {
  loadPhotoModerationThresholds,
  type PhotoModerationThresholds,
} from './photo-moderation.config';
import type {
  PhotoModerationOutcome,
  RejectionReasonCode,
} from './photo-moderation.types';

@Injectable()
export class PhotoModerationApplyService {
  private readonly logger = new Logger(PhotoModerationApplyService.name);
  private readonly thresholds: PhotoModerationThresholds;

  constructor(
    @Inject(PROFILE_PHOTO_REPOSITORY)
    private readonly photos: IProfilePhotoRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly rejectionEmail: PhotoRejectionEmailService,
  ) {
    this.thresholds = loadPhotoModerationThresholds();
  }

  /**
   * Apply ML/SLA outcome. When `expectedStatuses` is set, uses a conditional
   * update so stale workers cannot overwrite admin/SLA transitions.
   * @returns false if the row was skipped (status race / already decided)
   */
  async applyOutcome(
    photoId: string,
    profileId: string,
    userId: string,
    outcome: PhotoModerationOutcome,
    audit: {
      event: string;
      reviewerId?: string;
      expectedStatuses?: UserProfilePhotoStatus[];
    },
  ): Promise<boolean> {
    const status =
      outcome.status === 'APPROVED'
        ? UserProfilePhotoStatus.APPROVED
        : outcome.status === 'REJECTED'
          ? UserProfilePhotoStatus.REJECTED
          : UserProfilePhotoStatus.FLAGGED_FOR_REVIEW;

    if (status === UserProfilePhotoStatus.APPROVED) {
      const applied = await this.photos.conditionalApproveAndMaybeSetPrimary({
        photoId,
        profileId,
        expectedStatuses: audit.expectedStatuses,
        data: {
          status,
          moderationProvider:
            outcome.result.source === 'sla'
              ? 'sla'
              : outcome.result.source === 'manual'
                ? 'manual'
                : this.thresholds.moderationDriver === 'mock'
                  ? 'mock'
                  : 'rekognition',
          moderationResultJson: outcome.result as object,
          rejectionReason: null,
        },
      });
      if (!applied) {
        this.logger.warn(
          `photo moderation apply skipped (race) photoId=${photoId} target=APPROVED`,
        );
        return false;
      }
    } else {
      const applied = await this.photos.conditionalUpdateModeration({
        photoId,
        expectedStatuses: audit.expectedStatuses,
        data: {
          status,
          moderationProvider:
            outcome.result.source === 'manual'
              ? 'manual'
              : this.thresholds.moderationDriver === 'mock'
                ? 'mock'
                : 'rekognition',
          moderationResultJson: outcome.result as object,
          rejectionReason: outcome.rejectionReason ?? null,
          isPrimary: false,
        },
      });
      if (!applied) {
        this.logger.warn(
          `photo moderation apply skipped (race) photoId=${photoId} target=${status}`,
        );
        return false;
      }
    }

    this.logModerationEvent({
      event: audit.event,
      photoId,
      userId,
      mlConfidence: outcome.result.mlConfidence,
      mlLabels: outcome.result.mlLabels,
      reviewerId: audit.reviewerId,
      rejectionReasonCode: outcome.rejectionReasonCode,
    });

    if (
      status === UserProfilePhotoStatus.REJECTED &&
      outcome.rejectionReasonCode
    ) {
      void this.rejectionEmail
        .sendBestEffort({
          userId,
          photoId,
          rejectionReasonCode: outcome.rejectionReasonCode,
        })
        .catch(() => undefined);
    }
    return true;
  }

  logModerationEvent(params: {
    event: string;
    photoId: string;
    userId: string;
    mlConfidence?: number;
    mlLabels?: string[];
    reviewerId?: string;
    rejectionReasonCode?: RejectionReasonCode;
  }): void {
    const payload = {
      logKind: 'photo_moderation',
      event: params.event,
      photoId: params.photoId,
      userId: params.userId,
      mlConfidence: params.mlConfidence ?? null,
      mlLabels: params.mlLabels ?? [],
      reviewerId: params.reviewerId ?? null,
      rejectionReasonCode: params.rejectionReasonCode ?? null,
      timestamp: new Date().toISOString(),
    };
    this.obs.trace(JSON.stringify(payload), ErrorCodes.PHOTO_MODERATION_EVENT);
  }
}
