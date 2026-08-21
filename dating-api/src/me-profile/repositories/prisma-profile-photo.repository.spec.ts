import { UserProfilePhotoStatus } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { PrismaProfilePhotoRepository } from './prisma-profile-photo.repository';

describe('PrismaProfilePhotoRepository', () => {
  const userProfilePhoto = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  };
  const prisma = {
    userProfilePhoto,
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  let repo: PrismaProfilePhotoRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma),
    );
    repo = new PrismaProfilePhotoRepository(prisma);
  });

  it('setPrimaryExclusive clears all primaries then sets the target', async () => {
    userProfilePhoto.updateMany.mockResolvedValue({ count: 2 });
    userProfilePhoto.update.mockResolvedValue({
      id: 'p2',
      profileId: 'prof',
      isPrimary: true,
    });

    await repo.setPrimaryExclusive('prof', 'p2');

    expect(userProfilePhoto.updateMany).toHaveBeenCalledWith({
      where: { profileId: 'prof' },
      data: { isPrimary: false },
    });
    expect(userProfilePhoto.update).toHaveBeenCalledWith({
      where: { id: 'p2' },
      data: { isPrimary: true },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('approveManualReview sets isPrimary only when no APPROVED primary exists', async () => {
    userProfilePhoto.findFirst.mockResolvedValue(null);
    userProfilePhoto.update.mockResolvedValue({ id: 'p1', isPrimary: true });

    await repo.approveManualReview({
      photoId: 'p1',
      profileId: 'prof',
      data: {
        moderationProvider: 'manual',
        moderationResultJson: {},
      },
    });

    expect(userProfilePhoto.findFirst).toHaveBeenCalledWith({
      where: {
        profileId: 'prof',
        status: UserProfilePhotoStatus.APPROVED,
        isPrimary: true,
      },
      select: { id: true },
    });
    expect(userProfilePhoto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          status: UserProfilePhotoStatus.APPROVED,
          isPrimary: true,
          rejectionReason: null,
        }),
      }),
    );
  });

  it('approveManualReview does not demote when APPROVED primary already exists', async () => {
    userProfilePhoto.findFirst.mockResolvedValue({ id: 'primary' });
    userProfilePhoto.update.mockResolvedValue({ id: 'p1', isPrimary: false });

    await repo.approveManualReview({
      photoId: 'p1',
      profileId: 'prof',
      data: {
        moderationProvider: 'manual',
        moderationResultJson: {},
      },
    });

    expect(userProfilePhoto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPrimary: false }),
      }),
    );
  });

  it('conditionalApproveAndMaybeSetPrimary returns false when updateMany races', async () => {
    userProfilePhoto.findFirst.mockResolvedValue(null);
    userProfilePhoto.updateMany.mockResolvedValue({ count: 0 });

    const ok = await repo.conditionalApproveAndMaybeSetPrimary({
      photoId: 'p1',
      profileId: 'prof',
      expectedStatuses: ['PENDING'],
      data: {
        status: UserProfilePhotoStatus.APPROVED,
        moderationProvider: 'rekognition',
        moderationResultJson: {},
        rejectionReason: null,
      },
    });

    expect(ok).toBe(false);
    expect(userProfilePhoto.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'p1',
          status: { in: ['PENDING'] },
        },
      }),
    );
  });

  it('conditionalUpdateModeration returns true when a row was updated', async () => {
    userProfilePhoto.updateMany.mockResolvedValue({ count: 1 });

    const ok = await repo.conditionalUpdateModeration({
      photoId: 'p1',
      expectedStatuses: ['PENDING'],
      data: {
        status: UserProfilePhotoStatus.REJECTED,
        moderationProvider: 'rekognition',
        moderationResultJson: {},
        rejectionReason: 'x',
        isPrimary: false,
      },
    });

    expect(ok).toBe(true);
  });
});
