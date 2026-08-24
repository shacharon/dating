import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  loadPhotoModerationThresholds,
  type PhotoModerationThresholds,
} from './photo-moderation.config';
import { REKOGNITION, type RekognitionPort } from './photo-moderation.ports';
import {
  maxMlConfidence,
  parseModerationResultJson,
  REJECTION_REASON_USER_COPY_EN,
  type PhotoModerationOutcome,
  type PhotoModerationResultJson,
} from './photo-moderation.types';
import { PHOTO_STORAGE } from './photo-storage.module';
import type { PhotoStorage } from './photo-storage.types';

@Injectable()
export class PhotoModerationDecisionService {
  private readonly logger = new Logger(PhotoModerationDecisionService.name);
  private readonly thresholds: PhotoModerationThresholds;

  constructor(
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
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
      if (
        this.thresholds.faceDetectionEnabled &&
        this.rekognition.detectFaces
      ) {
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
