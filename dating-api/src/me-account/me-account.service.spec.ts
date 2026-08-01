import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageStatus,
  MutualMatchStatus,
  UserProfileStatus,
  UserStatus,
} from '@prisma/client';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PhotoStorage } from '../photo-storage/photo-storage.types';
import type { PrismaService } from '../prisma/prisma.service';
import {
  MeAccountService,
  scrubbedDeletedUserEmail,
  scrubbedDeletedUserGoogleId,
} from './me-account.service';

describe('scrubbedDeletedUserEmail', () => {
  it('returns deterministic scrubbed email', () => {
    expect(scrubbedDeletedUserEmail('user-abc')).toBe(
      'deleted+user-abc@deleted.invalid',
    );
  });
});

describe('MeAccountService', () => {
  const tx = {
    userProfilePhoto: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    userProfileEvaluation: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    userProfileSignal: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    userProfileInterest: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    userProfilePreference: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    userProfile: { update: jest.fn().mockResolvedValue({}) },
    matchAction: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    matchFeedback: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
    userContentViolation: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    mutualMatch: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
    message: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    user: { update: jest.fn().mockResolvedValue({}) },
  };

  const prisma = {
    user: { findUnique: jest.fn() },
    userProfile: { findUnique: jest.fn() },
    userProfilePhoto: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) =>
      fn(tx),
    ),
  } as unknown as PrismaService;

  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  const analytics = { track: jest.fn() } as unknown as AnalyticsService;
  const photoStorage = {
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as PhotoStorage;

  let service: MeAccountService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeAccountService(prisma, obs, analytics, photoStorage);
  });

  it('rejects invalid confirmation', async () => {
    await expect(
      service.deleteAccountForUser('user-1', 'delete'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('returns 404 when user already deleted in service', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      deletedAt: new Date(),
    });
    await expect(
      service.deleteAccountForUser('user-1', 'DELETE'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('scrubs user, profile, unmatches, and anonymizes messages', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      deletedAt: null,
    });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'prof-1',
    });

    await service.deleteAccountForUser('user-1', 'DELETE');

    expect(analytics.track).toHaveBeenCalledWith(
      'user-1',
      ProductAnalyticsEvents.ACCOUNT_DELETED,
      {},
    );
    expect(tx.userProfile.update).toHaveBeenCalledWith({
      where: { id: 'prof-1' },
      data: expect.objectContaining({
        nickname: null,
        status: UserProfileStatus.DRAFT,
      }),
    });
    expect(tx.matchAction.deleteMany).toHaveBeenCalledWith({
      where: { actorUserId: 'user-1' },
    });
    expect(tx.matchFeedback.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(tx.userContentViolation.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(tx.matchFeedback.deleteMany).toHaveBeenCalledWith({
      where: { matchProfileId: 'prof-1' },
    });
    expect(tx.mutualMatch.updateMany).toHaveBeenCalledWith({
      where: {
        status: MutualMatchStatus.ACTIVE,
        OR: [{ userId1: 'user-1' }, { userId2: 'user-1' }],
      },
      data: expect.objectContaining({
        status: MutualMatchStatus.UNMATCHED,
        unmatchedByUserId: 'user-1',
      }),
    });
    expect(tx.message.updateMany).toHaveBeenCalledWith({
      where: { senderId: 'user-1' },
      data: {
        text: '[deleted user]',
        status: MessageStatus.DELETED,
      },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: expect.objectContaining({
        status: UserStatus.DISABLED,
        email: scrubbedDeletedUserEmail('user-1'),
        googleId: scrubbedDeletedUserGoogleId('user-1'),
      }),
    });
    expect(obs.trace).toHaveBeenCalled();
  });

  it('fires analytics before DB transaction', async () => {
    const order: string[] = [];
    (analytics.track as jest.Mock).mockImplementation(() => {
      order.push('analytics');
    });
    (prisma.$transaction as jest.Mock).mockImplementation(async () => {
      order.push('transaction');
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      deletedAt: null,
    });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue(null);

    await service.deleteAccountForUser('user-1', 'DELETE');

    expect(order).toEqual(['analytics', 'transaction']);
  });

  it('logs photo storage failure without aborting delete', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      deletedAt: null,
    });
    (prisma.userProfile.findUnique as jest.Mock).mockResolvedValue({
      id: 'prof-1',
    });
    (prisma.userProfilePhoto.findMany as jest.Mock).mockResolvedValue([
      { id: 'photo-1', storageKey: 'photos/1.jpg' },
    ]);
    (photoStorage.delete as jest.Mock).mockRejectedValue(new Error('s3 down'));

    await service.deleteAccountForUser('user-1', 'DELETE');

    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('photoId=photo-1'),
      ErrorCodes.ACCOUNT_DELETE_PHOTO_STORAGE_FAILED,
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
