import { NotFoundException } from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import type { AnalyticsService } from '../../analytics/analytics.service';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type { PhotoRejectionEmailService } from '../../notifications/photo-rejection-email.service';
import type { PhotoModerationService } from '../../photo-storage/photo-moderation.service';
import type { PhotoStorage } from '../../photo-storage/photo-storage.types';
import type { PrismaService } from '../../prisma/prisma.service';
import { AdminPhotosService } from './admin-photos.service';
import { PhotoModerationDecision } from './dto/moderate-photo.dto';

describe('AdminPhotosService', () => {
  const photoStorage = {
    read: jest.fn(),
  } as unknown as PhotoStorage;

  const analytics = { track: jest.fn() } as unknown as AnalyticsService;
  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  const moderation = {
    extractMlFields: jest.fn().mockReturnValue({ mlConfidence: null, mlLabels: [] }),
    logModerationEvent: jest.fn(),
  } as unknown as PhotoModerationService;
  const rejectionEmail = {
    sendBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as PhotoRejectionEmailService;

  const prisma = {
    userProfilePhoto: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  let service: AdminPhotosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminPhotosService(
      prisma,
      obs,
      analytics,
      moderation,
      rejectionEmail,
      photoStorage,
    );
  });

  it('lists pending photos FIFO', async () => {
    prisma.userProfilePhoto.findMany = jest.fn().mockResolvedValue([
      {
        id: 'photo_1',
        profileId: 'prof_1',
        createdAt: new Date('2026-06-01T00:00:00.000Z'),
        mimeType: 'image/jpeg',
        originalFileName: 'a.jpg',
        status: UserProfilePhotoStatus.PENDING,
        moderationProvider: 'manual_queue',
        moderationResultJson: null,
        profile: { userId: 'user_1' },
      },
    ]);

    const res = await service.listPending(50);
    expect(res.items).toHaveLength(1);
    expect(res.items[0]?.fileUrl).toBe('/api/v1/admin/photos/photo_1/file');
    expect(res.items[0]?.status).toBe('PENDING');
    expect(res.nextCursor).toBeNull();
  });

  it('moderatePhoto rejects when not reviewable', async () => {
    prisma.userProfilePhoto.findUnique = jest.fn().mockResolvedValue({
      id: 'photo_1',
      status: UserProfilePhotoStatus.APPROVED,
      profileId: 'prof_1',
      profile: { userId: 'user_1' },
    });

    await expect(
      service.moderatePhoto('admin_1', 'photo_1', {
        decision: PhotoModerationDecision.APPROVE,
      }),
    ).rejects.toMatchObject({ response: { error: 'photo_not_reviewable' } });
  });

  it('approve sets primary when none exists', async () => {
    prisma.userProfilePhoto.findUnique = jest.fn().mockResolvedValue({
      id: 'photo_1',
      status: UserProfilePhotoStatus.PENDING,
      profileId: 'prof_1',
      profile: { userId: 'user_1' },
    });
    prisma.$transaction = jest.fn(async (fn) =>
      fn({
        userProfilePhoto: {
          findFirst: jest.fn().mockResolvedValue(null),
          update: jest.fn().mockResolvedValue({
            id: 'photo_1',
            profileId: 'prof_1',
            status: UserProfilePhotoStatus.APPROVED,
            rejectionReason: null,
            isPrimary: true,
            updatedAt: new Date('2026-06-01T01:00:00.000Z'),
          }),
        },
      }),
    );

    const res = await service.moderatePhoto('admin_1', 'photo_1', {
      decision: PhotoModerationDecision.APPROVE,
    });
    expect(res.status).toBe(UserProfilePhotoStatus.APPROVED);
    expect(res.isPrimary).toBe(true);
    expect(analytics.track).toHaveBeenCalledWith(
      'user_1',
      ProductAnalyticsEvents.PHOTO_MODERATION_DECIDED,
      { decision: 'approve' },
    );
  });

  it('reject stores reason and tracks analytics', async () => {
    prisma.userProfilePhoto.findUnique = jest.fn().mockResolvedValue({
      id: 'photo_1',
      status: UserProfilePhotoStatus.FLAGGED_FOR_REVIEW,
      profileId: 'prof_1',
      profile: { userId: 'user_1' },
    });
    prisma.userProfilePhoto.update = jest.fn().mockResolvedValue({
      id: 'photo_1',
      profileId: 'prof_1',
      status: UserProfilePhotoStatus.REJECTED,
      rejectionReason: 'Blurry image',
      isPrimary: false,
      updatedAt: new Date('2026-06-01T01:00:00.000Z'),
    });

    const res = await service.moderatePhoto('admin_1', 'photo_1', {
      decision: PhotoModerationDecision.REJECT,
      rejectionReason: 'Blurry image',
    });
    expect(res.status).toBe(UserProfilePhotoStatus.REJECTED);
    expect(res.rejectionReason).toBe('Blurry image');
    expect(rejectionEmail.sendBestEffort).toHaveBeenCalled();
    expect(analytics.track).toHaveBeenCalledWith(
      'user_1',
      ProductAnalyticsEvents.PHOTO_MODERATION_DECIDED,
      { decision: 'reject' },
    );
  });

  it('getPhotoFile throws when missing', async () => {
    prisma.userProfilePhoto.findUnique = jest.fn().mockResolvedValue(null);
    await expect(service.getPhotoFile('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
