import { UserProfilePhotoStatus } from '@prisma/client';
import type { PhotoRejectionEmailService } from '../notifications/photo-rejection-email.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { IProfilePhotoRepository } from '../me-profile/repositories/profile-photo.repository';
import { PhotoModerationApplyService } from './photo-moderation-apply.service';
import { PhotoModerationDecisionService } from './photo-moderation-decision.service';
import type { PhotoStorage } from './photo-storage.types';
import {
  PhotoModerationService,
  type RekognitionPort,
} from './photo-moderation.service';

describe('PhotoModerationService', () => {
  const photos = {
    findByIdWithOwnerUserId: jest.fn(),
    conditionalApproveAndMaybeSetPrimary: jest.fn(),
    conditionalUpdateModeration: jest.fn(),
  };

  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  const photoStorage = {
    read: jest.fn().mockResolvedValue(Buffer.from([1, 2, 3])),
  } as unknown as PhotoStorage;
  const rejectionEmail = {
    sendBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as PhotoRejectionEmailService;

  let rekognition: jest.Mocked<RekognitionPort>;
  let service: PhotoModerationService;

  const prevEnv: Record<string, string | undefined> = {};

  function setEnv(key: string, value: string | undefined) {
    if (!(key in prevEnv)) prevEnv[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    setEnv('NSFW_FLAG_THRESHOLD', '50');
    setEnv('NSFW_AUTO_REJECT_THRESHOLD', '80');
    setEnv('PHOTO_FACE_DETECTION_ENABLED', '1');
    setEnv('PHOTO_MODERATION_DRIVER', 'rekognition');
    setEnv('PHOTO_STORAGE_DRIVER', 'local');

    rekognition = {
      detectModerationLabels: jest.fn(),
      detectFaces: jest.fn(),
    };

    const decision = new PhotoModerationDecisionService(
      photoStorage,
      rekognition,
    );
    const apply = new PhotoModerationApplyService(
      photos as unknown as IProfilePhotoRepository,
      obs,
      rejectionEmail,
    );
    service = new PhotoModerationService(
      photos as unknown as IProfilePhotoRepository,
      decision,
      apply,
    );
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  describe('decideFromScores', () => {
    it('approves empty labels / confidence 0', () => {
      const out = service.decideFromScores({
        mlConfidence: 0,
        mlLabels: [],
        faceCount: 1,
      });
      expect(out.status).toBe('APPROVED');
      expect(out.result.decision).toBe('approved');
    });

    it('approves just below flag threshold', () => {
      expect(
        service.decideFromScores({
          mlConfidence: 49.9,
          mlLabels: ['Suggestive'],
          faceCount: 1,
        }).status,
      ).toBe('APPROVED');
    });

    it('flags at flag threshold and below reject', () => {
      expect(
        service.decideFromScores({
          mlConfidence: 50,
          mlLabels: ['Suggestive'],
          faceCount: 1,
        }).status,
      ).toBe('FLAGGED_FOR_REVIEW');
      expect(
        service.decideFromScores({
          mlConfidence: 79.9,
          mlLabels: ['Suggestive'],
          faceCount: 1,
        }).status,
      ).toBe('FLAGGED_FOR_REVIEW');
    });

    it('rejects at reject threshold with explicit_content', () => {
      const out = service.decideFromScores({
        mlConfidence: 80,
        mlLabels: ['Explicit Nudity'],
        faceCount: 1,
      });
      expect(out.status).toBe('REJECTED');
      expect(out.rejectionReasonCode).toBe('explicit_content');
    });

    it('flags no_face when face detection on and faceCount 0', () => {
      const out = service.decideFromScores({
        mlConfidence: 0,
        mlLabels: [],
        faceCount: 0,
      });
      expect(out.status).toBe('FLAGGED_FOR_REVIEW');
      expect(out.rejectionReasonCode).toBe('no_face');
    });

    it('reject band wins over no_face', () => {
      const out = service.decideFromScores({
        mlConfidence: 90,
        mlLabels: ['Explicit Nudity'],
        faceCount: 0,
      });
      expect(out.status).toBe('REJECTED');
      expect(out.rejectionReasonCode).toBe('explicit_content');
    });
  });

  describe('decideFromRekognition', () => {
    it('maps safe labels to approved', async () => {
      rekognition.detectModerationLabels.mockResolvedValue({
        ModerationLabels: [],
        $metadata: {},
      });
      rekognition.detectFaces!.mockResolvedValue({
        FaceDetails: [{}],
        $metadata: {},
      });

      const out = await service.decideFromRekognition({
        photoId: 'p1',
        storageKey: 'key/p1.jpg',
      });
      expect(out.status).toBe('APPROVED');
    });

    it('flags on Rekognition error (never silent approve)', async () => {
      rekognition.detectModerationLabels.mockRejectedValue(
        new Error('aws down'),
      );

      const out = await service.decideFromRekognition({
        photoId: 'p1',
        storageKey: 'key/p1.jpg',
      });
      expect(out.status).toBe('FLAGGED_FOR_REVIEW');
      expect(out.result.error).toContain('aws down');
    });
  });

  describe('applyOutcome race guard', () => {
    it('skips when expectedStatuses do not match', async () => {
      photos.conditionalUpdateModeration.mockResolvedValue(false);

      const applied = await service.applyOutcome(
        'photo_1',
        'prof_1',
        'user_1',
        {
          status: 'FLAGGED_FOR_REVIEW',
          result: { source: 'ml', decision: 'flagged', error: 'stale' },
        },
        {
          event: 'flagged',
          expectedStatuses: [UserProfilePhotoStatus.PENDING],
        },
      );
      expect(applied).toBe(false);
      expect(rejectionEmail.sendBestEffort).not.toHaveBeenCalled();
      expect(obs.trace).not.toHaveBeenCalled();
    });

    it('sends rejection email once on ML auto-reject', async () => {
      photos.conditionalUpdateModeration.mockResolvedValue(true);

      const applied = await service.applyOutcome(
        'photo_1',
        'prof_1',
        'user_1',
        {
          status: 'REJECTED',
          rejectionReasonCode: 'explicit_content',
          rejectionReason: 'bad',
          result: {
            source: 'ml',
            decision: 'rejected',
            rejectionReasonCode: 'explicit_content',
            mlConfidence: 90,
          },
        },
        {
          event: 'auto_rejected',
          expectedStatuses: [UserProfilePhotoStatus.PENDING],
        },
      );
      expect(applied).toBe(true);
      expect(rejectionEmail.sendBestEffort).toHaveBeenCalledTimes(1);
    });
  });
});
