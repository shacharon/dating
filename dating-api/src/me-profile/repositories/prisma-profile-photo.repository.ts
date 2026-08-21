import { Injectable } from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { IProfilePhotoRepository } from './profile-photo.repository';
import type {
  CreatePhotoData,
  ManualApproveData,
  ManualRejectData,
  ModerationApproveData,
  ModerationUpdateData,
  PhotoLiteRow,
  PhotoRow,
  PhotoWithOwner,
  ReviewablePhotoRow,
  StorageMeta,
} from './profile-photo.repository.types';

const REVIEWABLE: UserProfilePhotoStatus[] = [
  UserProfilePhotoStatus.PENDING,
  UserProfilePhotoStatus.FLAGGED_FOR_REVIEW,
];

@Injectable()
export class PrismaProfilePhotoRepository implements IProfilePhotoRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForProfile(profileId: string): Promise<PhotoRow[]> {
    return this.prisma.userProfilePhoto.findMany({
      where: { profileId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listLiteForProfile(profileId: string): Promise<PhotoLiteRow[]> {
    return this.prisma.userProfilePhoto.findMany({
      where: { profileId },
      orderBy: [{ position: 'asc' }],
      select: { id: true, position: true, status: true, isPrimary: true },
    });
  }

  create(data: CreatePhotoData): Promise<PhotoRow> {
    return this.prisma.userProfilePhoto.create({ data });
  }

  updateStorageKey(photoId: string, storageKey: string): Promise<PhotoRow> {
    return this.prisma.userProfilePhoto.update({
      where: { id: photoId },
      data: { storageKey },
    });
  }

  async deleteById(photoId: string): Promise<void> {
    await this.prisma.userProfilePhoto.delete({ where: { id: photoId } });
  }

  findByIdAndProfileId(
    photoId: string,
    profileId: string,
  ): Promise<PhotoRow | null> {
    return this.prisma.userProfilePhoto.findFirst({
      where: { id: photoId, profileId },
    });
  }

  findStorageMetaByIdAndProfileId(
    photoId: string,
    profileId: string,
  ): Promise<StorageMeta | null> {
    return this.prisma.userProfilePhoto.findFirst({
      where: { id: photoId, profileId },
      select: { id: true, profileId: true, storageKey: true, mimeType: true },
    });
  }

  findFirstApprovedByProfile(profileId: string): Promise<PhotoRow | null> {
    return this.prisma.userProfilePhoto.findFirst({
      where: { profileId, status: UserProfilePhotoStatus.APPROVED },
      orderBy: [{ position: 'asc' }],
    });
  }

  async clearPrimaryForProfileExcept(
    profileId: string,
    photoId: string,
  ): Promise<void> {
    await this.prisma.userProfilePhoto.updateMany({
      where: { profileId, id: { not: photoId } },
      data: { isPrimary: false },
    });
  }

  setPrimaryExclusive(profileId: string, photoId: string): Promise<PhotoRow> {
    return this.prisma.$transaction(async (tx) => {
      await tx.userProfilePhoto.updateMany({
        where: { profileId },
        data: { isPrimary: false },
      });
      return tx.userProfilePhoto.update({
        where: { id: photoId },
        data: { isPrimary: true },
      });
    });
  }

  findByIdLite(photoId: string): Promise<{
    id: string;
    createdAt: Date;
    status: UserProfilePhotoStatus;
  } | null> {
    return this.prisma.userProfilePhoto.findUnique({
      where: { id: photoId },
      select: { id: true, createdAt: true, status: true },
    });
  }

  findStorageMetaById(photoId: string): Promise<StorageMeta | null> {
    return this.prisma.userProfilePhoto.findUnique({
      where: { id: photoId },
      select: { id: true, profileId: true, storageKey: true, mimeType: true },
    });
  }

  findByIdWithOwnerUserId(photoId: string): Promise<PhotoWithOwner | null> {
    return this.prisma.userProfilePhoto.findUnique({
      where: { id: photoId },
      include: { profile: { select: { userId: true } } },
    });
  }

  listReviewablePage(args: {
    take: number;
    cursorCreatedAt?: Date;
    cursorId?: string;
  }): Promise<ReviewablePhotoRow[]> {
    const hasCursor = args.cursorCreatedAt != null && args.cursorId != null;
    return this.prisma.userProfilePhoto.findMany({
      where: {
        status: { in: REVIEWABLE },
        ...(hasCursor
          ? {
              OR: [
                { createdAt: { gt: args.cursorCreatedAt } },
                {
                  createdAt: args.cursorCreatedAt,
                  id: { gt: args.cursorId },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: args.take,
      include: { profile: { select: { userId: true } } },
    });
  }

  approveManualReview(args: {
    photoId: string;
    profileId: string;
    data: ManualApproveData;
  }): Promise<PhotoRow> {
    return this.prisma.$transaction(async (tx) => {
      const existingPrimary = await tx.userProfilePhoto.findFirst({
        where: {
          profileId: args.profileId,
          status: UserProfilePhotoStatus.APPROVED,
          isPrimary: true,
        },
        select: { id: true },
      });
      return tx.userProfilePhoto.update({
        where: { id: args.photoId },
        data: {
          status: UserProfilePhotoStatus.APPROVED,
          ...args.data,
          rejectionReason: null,
          isPrimary: !existingPrimary,
        },
      });
    });
  }

  rejectManualReview(
    photoId: string,
    data: ManualRejectData,
  ): Promise<PhotoRow> {
    return this.prisma.userProfilePhoto.update({
      where: { id: photoId },
      data: {
        status: UserProfilePhotoStatus.REJECTED,
        ...data,
        isPrimary: false,
      },
    });
  }

  conditionalApproveAndMaybeSetPrimary(args: {
    photoId: string;
    profileId: string;
    expectedStatuses?: string[];
    data: ModerationApproveData;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const existingPrimary = await tx.userProfilePhoto.findFirst({
        where: {
          profileId: args.profileId,
          status: UserProfilePhotoStatus.APPROVED,
          isPrimary: true,
        },
        select: { id: true },
      });
      const updated = await tx.userProfilePhoto.updateMany({
        where: {
          id: args.photoId,
          ...(args.expectedStatuses?.length
            ? {
                status: {
                  in: args.expectedStatuses as UserProfilePhotoStatus[],
                },
              }
            : {}),
        },
        data: { ...args.data, isPrimary: !existingPrimary },
      });
      return updated.count > 0;
    });
  }

  async conditionalUpdateModeration(args: {
    photoId: string;
    expectedStatuses?: string[];
    data: ModerationUpdateData;
  }): Promise<boolean> {
    const updated = await this.prisma.userProfilePhoto.updateMany({
      where: {
        id: args.photoId,
        ...(args.expectedStatuses?.length
          ? {
              status: {
                in: args.expectedStatuses as UserProfilePhotoStatus[],
              },
            }
          : {}),
      },
      data: args.data,
    });
    return updated.count > 0;
  }

  listStuckRekognitionPending(args: {
    cutoff: Date;
    take: number;
  }): Promise<PhotoWithOwner[]> {
    return this.prisma.userProfilePhoto.findMany({
      where: {
        status: UserProfilePhotoStatus.PENDING,
        moderationProvider: 'rekognition',
        createdAt: { lt: args.cutoff },
      },
      include: { profile: { select: { userId: true } } },
      take: args.take,
    });
  }

  listFlaggedOlderThan(args: {
    cutoff: Date;
    take: number;
  }): Promise<PhotoWithOwner[]> {
    return this.prisma.userProfilePhoto.findMany({
      where: {
        status: UserProfilePhotoStatus.FLAGGED_FOR_REVIEW,
        createdAt: { lt: args.cutoff },
      },
      include: { profile: { select: { userId: true } } },
      take: args.take,
    });
  }

  listRecentSlaApprovals(args: {
    since: Date;
    take: number;
  }): Promise<Array<{ id: string }>> {
    return this.prisma.userProfilePhoto.findMany({
      where: {
        status: UserProfilePhotoStatus.APPROVED,
        moderationProvider: 'sla',
        updatedAt: { gte: args.since },
      },
      select: { id: true },
      take: args.take,
    });
  }
}
