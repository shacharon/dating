import { Inject, Injectable } from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import {
  PROFILE_PHOTO_REPOSITORY,
  type IProfilePhotoRepository,
} from '../me-profile/repositories/profile-photo.repository';
import { PhotoModerationApplyService } from './photo-moderation-apply.service';
import type { PhotoModerationThresholds } from './photo-moderation.config';
import { PhotoModerationDecisionService } from './photo-moderation-decision.service';
import type {
  PhotoModerationOutcome,
  RejectionReasonCode,
} from './photo-moderation.types';

export type { RekognitionPort } from './photo-moderation.ports';

@Injectable()
export class PhotoModerationService {
  constructor(
    @Inject(PROFILE_PHOTO_REPOSITORY)
    private readonly photos: IProfilePhotoRepository,
    private readonly decision: PhotoModerationDecisionService,
    private readonly apply: PhotoModerationApplyService,
  ) {}

  getThresholds(): PhotoModerationThresholds {
    return this.decision.getThresholds();
  }

  /**
   * Pure threshold decision from ML outputs (unit-testable without AWS).
   */
  decideFromScores(input: {
    mlConfidence: number;
    mlLabels: string[];
    faceCount?: number;
  }): PhotoModerationOutcome {
    return this.decision.decideFromScores(input);
  }

  decideFromRekognition(input: {
    photoId: string;
    storageKey: string;
  }): Promise<PhotoModerationOutcome> {
    return this.decision.decideFromRekognition(input);
  }

  async processPendingPhoto(photoId: string): Promise<void> {
    const row = await this.photos.findByIdWithOwnerUserId(photoId);
    if (!row) return;
    if (row.status !== UserProfilePhotoStatus.PENDING) return;

    const driver = this.decision.getThresholds().moderationDriver;
    if (driver === 'stub') return;

    // Local sprint path without AWS: treat as safe AI approve (admin not involved).
    if (driver === 'mock') {
      await this.apply.applyOutcome(
        row.id,
        row.profileId,
        row.profile.userId,
        {
          status: 'APPROVED',
          result: {
            source: 'ml',
            decision: 'approved',
            mlConfidence: 0,
            mlLabels: [],
          },
        },
        {
          event: 'auto_approved',
          expectedStatuses: [UserProfilePhotoStatus.PENDING],
        },
      );
      return;
    }

    if (driver !== 'rekognition') return;

    const outcome = await this.decision.decideFromRekognition({
      photoId: row.id,
      storageKey: row.storageKey,
    });
    await this.apply.applyOutcome(
      row.id,
      row.profileId,
      row.profile.userId,
      outcome,
      {
        event:
          outcome.status === 'APPROVED'
            ? 'auto_approved'
            : outcome.status === 'REJECTED'
              ? 'auto_rejected'
              : outcome.result.error
                ? 'ml_error_flagged'
                : 'flagged',
        expectedStatuses: [UserProfilePhotoStatus.PENDING],
      },
    );
  }

  /**
   * Apply ML/SLA outcome. When `expectedStatuses` is set, uses a conditional
   * update so stale workers cannot overwrite admin/SLA transitions.
   * @returns false if the row was skipped (status race / already decided)
   */
  applyOutcome(
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
    return this.apply.applyOutcome(photoId, profileId, userId, outcome, audit);
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
    this.apply.logModerationEvent(params);
  }

  extractMlFields(raw: unknown): {
    mlConfidence: number | null;
    mlLabels: string[];
  } {
    return this.decision.extractMlFields(raw);
  }
}
