import { Inject, Injectable, Logger } from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PrismaService } from '../prisma/prisma.service';
import { PhotoRejectionEmailService } from '../notifications/photo-rejection-email.service';
import {
  loadPhotoModerationThresholds,
  type PhotoModerationThresholds,
} from './photo-moderation.config';
import {
  REKOGNITION,
  type RekognitionPort,
} from './photo-moderation.ports';
import {
  maxMlConfidence,
  parseModerationResultJson,
  REJECTION_REASON_USER_COPY_EN,
  type PhotoModerationOutcome,
  type PhotoModerationResultJson,
  type RejectionReasonCode,
} from './photo-moderation.types';
import { PHOTO_STORAGE } from './photo-storage.module';
import type { PhotoStorage } from './photo-storage.types';

export type { RekognitionPort } from './photo-moderation.ports';

@Injectable()
export class PhotoModerationService {
  private readonly logger = new Logger(PhotoModerationService.name);
  private readonly thresholds: PhotoModerationThresholds;

  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
    private readonly rejectionEmail: PhotoRejectionEmailService,
    @Inject(REKOGNITION) private readonly rekognition: RekognitionPort,
  ) {
    this.thresholds = loadPhotoModerationThresholds();
  }

  getThresholds(): PhotoModerationThresholds {
    return this.thresholds;
  }

  /**
   * Pure threshold decision from ML outputs (unit-testable without AWS).
   */
  decideFromScores(input: {
    mlConfidence: number;
    mlLabels: string[];
    faceCount?: number;
  }): PhotoModerationOutcome {
    const { flagThreshold, rejectThreshold, faceDetectionEnabled } =
      this.thresholds;
    const base: PhotoModerationResultJson = {
      source: 'ml',
      mlConfidence: input.mlConfidence,
      mlLabels: input.mlLabels,
      ...(input.faceCount !== undefined ? { faceCount: input.faceCount } : {}),
    };

    if (input.mlConfidence >= rejectThreshold) {
      return {
        status: 'REJECTED',
        rejectionReasonCode: 'explicit_content',
        rejectionReason: REJECTION_REASON_USER_COPY_EN.explicit_content,
        result: {
          ...base,
          decision: 'rejected',
          rejectionReasonCode: 'explicit_content',
        },
      };
    }

    if (
      faceDetectionEnabled &&
      input.faceCount !== undefined &&
      input.faceCount === 0
    ) {
      return {
        status: 'FLAGGED_FOR_REVIEW',
        rejectionReasonCode: 'no_face',
        result: {
          ...base,
          decision: 'flagged',
          rejectionReasonCode: 'no_face',
        },
      };
    }

    if (input.mlConfidence >= flagThreshold) {
      return {
        status: 'FLAGGED_FOR_REVIEW',
        result: { ...base, decision: 'flagged' },
      };
    }

    return {
      status: 'APPROVED',
      result: { ...base, decision: 'approved' },
    };
  }

  async decideFromRekognition(input: {
    photoId: string;
    storageKey: string;
  }): Promise<PhotoModerationOutcome> {
    try {
      const image = await this.buildImageInput(input.storageKey);
      const mod = await this.rekognition.detectModerationLabels({
        Image: image,
        MinConfidence: this.thresholds.flagThreshold,
      });
      const labels = mod.ModerationLabels ?? [];
      const mlLabels = labels
        .map((l) => l.Name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0);
      const mlConfidence = maxMlConfidence(labels);

      let faceCount: number | undefined;
      if (this.thresholds.faceDetectionEnabled && this.rekognition.detectFaces) {
        const faces = await this.rekognition.detectFaces({
          Image: image,
        });
        faceCount = faces.FaceDetails?.length ?? 0;
      }

      return this.decideFromScores({ mlConfidence, mlLabels, faceCount });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Rekognition failed photoId=${input.photoId}: ${message}`,
      );
      return {
        status: 'FLAGGED_FOR_REVIEW',
        result: {
          source: 'ml',
          decision: 'flagged',
          error: message.slice(0, 200),
        },
      };
    }
  }

  async processPendingPhoto(photoId: string): Promise<void> {
    const row = await this.prisma.userProfilePhoto.findUnique({
      where: { id: photoId },
      include: { profile: { select: { userId: true } } },
    });
    if (!row) return;
    if (row.status !== UserProfilePhotoStatus.PENDING) return;

    const driver = this.thresholds.moderationDriver;
    if (driver === 'stub') return;

    // Local sprint path without AWS: treat as safe AI approve (admin not involved).
    if (driver === 'mock') {
      await this.applyOutcome(
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

    const outcome = await this.decideFromRekognition({
      photoId: row.id,
      storageKey: row.storageKey,
    });
    await this.applyOutcome(row.id, row.profileId, row.profile.userId, outcome, {
      event:
        outcome.status === 'APPROVED'
          ? 'auto_approved'
          : outcome.status === 'REJECTED'
            ? 'auto_rejected'
            : outcome.result.error
              ? 'ml_error_flagged'
              : 'flagged',
      expectedStatuses: [UserProfilePhotoStatus.PENDING],
    });
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

    const expected = audit.expectedStatuses;
    const whereBase = expected?.length
      ? { id: photoId, status: { in: expected } }
      : { id: photoId };

    if (status === UserProfilePhotoStatus.APPROVED) {
      const applied = await this.prisma.$transaction(async (tx) => {
        const existingPrimary = await tx.userProfilePhoto.findFirst({
          where: {
            profileId,
            status: UserProfilePhotoStatus.APPROVED,
            isPrimary: true,
          },
          select: { id: true },
        });
        const updated = await tx.userProfilePhoto.updateMany({
          where: whereBase,
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
            isPrimary: !existingPrimary,
          },
        });
        return updated.count > 0;
      });
      if (!applied) {
        this.logger.warn(
          `photo moderation apply skipped (race) photoId=${photoId} target=APPROVED`,
        );
        return false;
      }
    } else {
      const updated = await this.prisma.userProfilePhoto.updateMany({
        where: whereBase,
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
      if (updated.count === 0) {
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

    if (status === UserProfilePhotoStatus.REJECTED && outcome.rejectionReasonCode) {
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

  extractMlFields(raw: unknown): {
    mlConfidence: number | null;
    mlLabels: string[];
  } {
    const parsed = parseModerationResultJson(raw);
    if (!parsed) return { mlConfidence: null, mlLabels: [] };
    return {
      mlConfidence:
        typeof parsed.mlConfidence === 'number' ? parsed.mlConfidence : null,
      mlLabels: Array.isArray(parsed.mlLabels)
        ? parsed.mlLabels.filter((x): x is string => typeof x === 'string')
        : [],
    };
  }

  private async buildImageInput(storageKey: string): Promise<{
    S3Object?: { Bucket: string; Name: string };
    Bytes?: Uint8Array;
  }> {
    if (
      this.thresholds.storageDriver === 's3' &&
      this.thresholds.s3Bucket &&
      !storageKey.startsWith('pending://')
    ) {
      return {
        S3Object: {
          Bucket: this.thresholds.s3Bucket,
          Name: storageKey,
        },
      };
    }
    const buf = await this.photoStorage.read(storageKey);
    if (!buf) {
      throw new Error('photo_bytes_unavailable');
    }
    return { Bytes: new Uint8Array(buf) };
  }
}
