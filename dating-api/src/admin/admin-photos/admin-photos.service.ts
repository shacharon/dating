import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PhotoRejectionEmailService } from '../../notifications/photo-rejection-email.service';
import { PhotoModerationService } from '../../photo-storage/photo-moderation.service';
import {
  REJECTION_REASON_USER_COPY_EN,
  type RejectionReasonCode,
} from '../../photo-storage/photo-moderation.types';
import { PHOTO_STORAGE } from '../../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../../photo-storage/photo-storage.types';
import {
  PROFILE_PHOTO_REPOSITORY,
  type IProfilePhotoRepository,
} from '../../me-profile/repositories/profile-photo.repository';
import type {
  ListPendingPhotosResponseDto,
  PendingPhotoListItemDto,
} from './dto/list-pending-photos.dto';
import {
  ModeratePhotoResponseDto,
  PhotoModerationDecision,
  type ModeratePhotoDto,
} from './dto/moderate-photo.dto';

const REVIEWABLE: UserProfilePhotoStatus[] = [
  UserProfilePhotoStatus.PENDING,
  UserProfilePhotoStatus.FLAGGED_FOR_REVIEW,
];

function adminPhotoFileUrl(photoId: string): string {
  return `/api/v1/admin/photos/${encodeURIComponent(photoId)}/file`;
}

@Injectable()
export class AdminPhotosService {
  constructor(
    @Inject(PROFILE_PHOTO_REPOSITORY)
    private readonly photos: IProfilePhotoRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    private readonly moderation: PhotoModerationService,
    private readonly rejectionEmail: PhotoRejectionEmailService,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
  ) {}

  async listPending(
    limit = 50,
    cursor?: string,
  ): Promise<ListPendingPhotosResponseDto> {
    const take = Math.min(Math.max(limit, 1), 100);
    let cursorRow: { id: string; createdAt: Date } | null = null;

    if (cursor?.trim()) {
      const row = await this.photos.findByIdLite(cursor.trim());
      if (row && REVIEWABLE.includes(row.status)) {
        cursorRow = { id: row.id, createdAt: row.createdAt };
      }
    }

    const rows = await this.photos.listReviewablePage({
      take: take + 1,
      ...(cursorRow
        ? {
            cursorCreatedAt: cursorRow.createdAt,
            cursorId: cursorRow.id,
          }
        : {}),
    });

    const page = rows.slice(0, take);
    const items: PendingPhotoListItemDto[] = page.map((row) => {
      const ml = this.moderation.extractMlFields(row.moderationResultJson);
      const status =
        row.status === UserProfilePhotoStatus.FLAGGED_FOR_REVIEW
          ? ('FLAGGED_FOR_REVIEW' as const)
          : ('PENDING' as const);
      return {
        id: row.id,
        profileId: row.profileId,
        userId: row.profile.userId,
        createdAt: row.createdAt.toISOString(),
        mimeType: row.mimeType,
        originalFileName: row.originalFileName,
        fileUrl: adminPhotoFileUrl(row.id),
        status,
        mlConfidence: ml.mlConfidence,
        mlLabels: ml.mlLabels,
        moderationProvider: row.moderationProvider,
      };
    });

    return {
      items,
      nextCursor: rows.length > take ? page[page.length - 1].id : null,
    };
  }

  async getPhotoFile(
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    const row = await this.photos.findStorageMetaById(photoId);
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found.',
      });
    }
    const content = await this.photoStorage.read(row.storageKey);
    if (!content) {
      throw new NotFoundException({
        error: 'photo_file_not_found',
        message: 'Photo file is missing from storage.',
      });
    }
    return { contentType: row.mimeType, content };
  }

  async moderatePhoto(
    adminUserId: string,
    photoId: string,
    body: ModeratePhotoDto,
  ): Promise<ModeratePhotoResponseDto> {
    const row = await this.photos.findByIdWithOwnerUserId(photoId);
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found.',
      });
    }
    if (!REVIEWABLE.includes(row.status)) {
      throw new UnprocessableEntityException({ error: 'photo_not_reviewable' });
    }

    const ownerUserId = row.profile.userId;
    const decision =
      body.decision === PhotoModerationDecision.APPROVE ? 'approve' : 'reject';

    const code = (body.rejectionReasonCode ?? undefined) as
      | RejectionReasonCode
      | undefined;
    const freeText = body.rejectionReason?.trim() || null;
    const rejectionReason =
      decision === 'reject'
        ? freeText ||
          (code ? REJECTION_REASON_USER_COPY_EN[code] : null) ||
          REJECTION_REASON_USER_COPY_EN.other
        : null;
    const rejectionReasonCode: RejectionReasonCode | undefined =
      decision === 'reject'
        ? (code ?? (freeText ? 'other' : 'other'))
        : undefined;

    const updated =
      body.decision === PhotoModerationDecision.APPROVE
        ? await this.approveReviewablePhoto(row.id, row.profileId, adminUserId)
        : await this.rejectReviewablePhoto(
            row.id,
            adminUserId,
            rejectionReason,
            rejectionReasonCode!,
          );

    this.obs.trace(
      `event=photo_moderation_decided adminUserId=${adminUserId} photoId=${photoId} profileId=${row.profileId} decision=${decision}`,
      ErrorCodes.ADMIN_PHOTO_MODERATION_DECIDED,
    );
    this.moderation.logModerationEvent({
      event: decision === 'approve' ? 'human_approved' : 'human_rejected',
      photoId,
      userId: ownerUserId,
      reviewerId: adminUserId,
      rejectionReasonCode,
    });
    this.analytics.track(
      ownerUserId,
      ProductAnalyticsEvents.PHOTO_MODERATION_DECIDED,
      {
        decision,
      },
    );

    if (decision === 'reject' && rejectionReasonCode) {
      void this.rejectionEmail
        .sendBestEffort({
          userId: ownerUserId,
          photoId,
          rejectionReasonCode,
        })
        .catch(() => undefined);
    }

    return {
      id: updated.id,
      profileId: updated.profileId,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      rejectionReasonCode: rejectionReasonCode ?? null,
      isPrimary: updated.isPrimary,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private async approveReviewablePhoto(
    photoId: string,
    profileId: string,
    adminUserId: string,
  ) {
    return this.photos.approveManualReview({
      photoId,
      profileId,
      data: {
        moderationProvider: 'manual',
        moderationResultJson: {
          source: 'manual',
          decision: 'approved',
          reviewedBy: adminUserId,
          reviewedAt: new Date().toISOString(),
        },
      },
    });
  }

  private async rejectReviewablePhoto(
    photoId: string,
    adminUserId: string,
    rejectionReason: string | null,
    rejectionReasonCode: RejectionReasonCode,
  ) {
    return this.photos.rejectManualReview(photoId, {
      moderationProvider: 'manual',
      moderationResultJson: {
        source: 'manual',
        decision: 'rejected',
        rejectionReasonCode,
        reviewedBy: adminUserId,
        reviewedAt: new Date().toISOString(),
      },
      rejectionReason,
    });
  }
}
