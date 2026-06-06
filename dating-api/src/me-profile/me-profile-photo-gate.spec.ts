import { UserProfilePhotoStatus } from '@prisma/client';
import {
  countApprovedPhotosForProfile,
  viewerHasApprovedPhoto,
} from './me-profile-photo-gate';

describe('me-profile-photo-gate', () => {
  const profileId = 'prof_gate_1';

  it('countApprovedPhotosForProfile queries APPROVED rows only', async () => {
    const count = jest.fn().mockResolvedValue(2);
    const prisma = { userProfilePhoto: { count } };

    await expect(
      countApprovedPhotosForProfile(prisma as never, profileId),
    ).resolves.toBe(2);

    expect(count).toHaveBeenCalledWith({
      where: { profileId, status: UserProfilePhotoStatus.APPROVED },
    });
  });

  it('viewerHasApprovedPhoto returns false when count is 0', async () => {
    const prisma = {
      userProfilePhoto: { count: jest.fn().mockResolvedValue(0) },
    };
    await expect(
      viewerHasApprovedPhoto(prisma as never, profileId),
    ).resolves.toBe(false);
  });

  it('viewerHasApprovedPhoto returns true when count is at least 1', async () => {
    const prisma = {
      userProfilePhoto: { count: jest.fn().mockResolvedValue(1) },
    };
    await expect(
      viewerHasApprovedPhoto(prisma as never, profileId),
    ).resolves.toBe(true);
  });
});
