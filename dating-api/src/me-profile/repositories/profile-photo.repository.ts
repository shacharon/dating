import type { UserProfilePhotoStatus } from '@prisma/client';
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

export const PROFILE_PHOTO_REPOSITORY = Symbol('PROFILE_PHOTO_REPOSITORY');

export interface IProfilePhotoRepository {
  listForProfile(profileId: string): Promise<PhotoRow[]>;
  listLiteForProfile(profileId: string): Promise<PhotoLiteRow[]>;
  create(data: CreatePhotoData): Promise<PhotoRow>;
  updateStorageKey(photoId: string, storageKey: string): Promise<PhotoRow>;
  deleteById(photoId: string): Promise<void>;
  findByIdAndProfileId(
    photoId: string,
    profileId: string,
  ): Promise<PhotoRow | null>;
  findStorageMetaByIdAndProfileId(
    photoId: string,
    profileId: string,
  ): Promise<StorageMeta | null>;
  findFirstApprovedByProfile(profileId: string): Promise<PhotoRow | null>;
  clearPrimaryForProfileExcept(
    profileId: string,
    photoId: string,
  ): Promise<void>;
  setPrimaryExclusive(profileId: string, photoId: string): Promise<PhotoRow>;

  findByIdLite(photoId: string): Promise<{
    id: string;
    createdAt: Date;
    status: UserProfilePhotoStatus;
  } | null>;
  findStorageMetaById(photoId: string): Promise<StorageMeta | null>;
  findByIdWithOwnerUserId(photoId: string): Promise<PhotoWithOwner | null>;
  listReviewablePage(args: {
    take: number;
    cursorCreatedAt?: Date;
    cursorId?: string;
  }): Promise<ReviewablePhotoRow[]>;
  approveManualReview(args: {
    photoId: string;
    profileId: string;
    data: ManualApproveData;
  }): Promise<PhotoRow>;
  rejectManualReview(
    photoId: string,
    data: ManualRejectData,
  ): Promise<PhotoRow>;

  conditionalApproveAndMaybeSetPrimary(args: {
    photoId: string;
    profileId: string;
    expectedStatuses?: string[];
    data: ModerationApproveData;
  }): Promise<boolean>;
  conditionalUpdateModeration(args: {
    photoId: string;
    expectedStatuses?: string[];
    data: ModerationUpdateData;
  }): Promise<boolean>;

  listStuckRekognitionPending(args: {
    cutoff: Date;
    take: number;
  }): Promise<PhotoWithOwner[]>;
  listFlaggedOlderThan(args: {
    cutoff: Date;
    take: number;
  }): Promise<PhotoWithOwner[]>;
  listRecentSlaApprovals(args: {
    since: Date;
    take: number;
  }): Promise<Array<{ id: string }>>;
}
