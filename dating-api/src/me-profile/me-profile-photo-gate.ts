import { UserProfilePhotoStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';

export async function countApprovedPhotosForProfile(
  prisma: Pick<PrismaService, 'userProfilePhoto'>,
  profileId: string,
): Promise<number> {
  return prisma.userProfilePhoto.count({
    where: { profileId, status: UserProfilePhotoStatus.APPROVED },
  });
}

export async function viewerHasApprovedPhoto(
  prisma: Pick<PrismaService, 'userProfilePhoto'>,
  profileId: string,
): Promise<boolean> {
  return (await countApprovedPhotosForProfile(prisma, profileId)) >= 1;
}

/** True when candidate profile has ≥1 APPROVED photo (browse eligibility). */
export async function candidateHasApprovedPhoto(
  prisma: Pick<PrismaService, 'userProfilePhoto'>,
  profileId: string,
): Promise<boolean> {
  return viewerHasApprovedPhoto(prisma, profileId);
}
