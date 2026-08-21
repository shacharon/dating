import type {
  Prisma,
  UserProfilePhoto,
  UserProfilePhotoStatus,
} from '@prisma/client';

export type PhotoRow = UserProfilePhoto;

export type PhotoLiteRow = Pick<
  UserProfilePhoto,
  'id' | 'position' | 'status' | 'isPrimary'
>;

export type StorageMeta = Pick<
  UserProfilePhoto,
  'id' | 'profileId' | 'storageKey' | 'mimeType'
>;

export type PhotoWithOwner = UserProfilePhoto & {
  profile: { userId: string };
};

export type ReviewablePhotoRow = PhotoWithOwner;

export type CreatePhotoData = {
  profileId: string;
  storageKey: string;
  originalFileName: string | null;
  mimeType: string;
  sizeBytes: number;
  position: number;
  status: UserProfilePhotoStatus;
  moderationProvider: string | null;
  moderationResultJson:
    | Prisma.InputJsonValue
    | Prisma.NullableJsonNullValueInput;
  isPrimary: boolean;
};

export type ManualApproveData = {
  moderationProvider: string;
  moderationResultJson: Prisma.InputJsonValue;
};

export type ManualRejectData = {
  moderationProvider: string;
  moderationResultJson: Prisma.InputJsonValue;
  rejectionReason: string | null;
};

export type ModerationApproveData = {
  status: UserProfilePhotoStatus;
  moderationProvider: string;
  moderationResultJson: Prisma.InputJsonValue;
  rejectionReason: null;
};

export type ModerationUpdateData = {
  status: UserProfilePhotoStatus;
  moderationProvider: string;
  moderationResultJson: Prisma.InputJsonValue;
  rejectionReason: string | null;
  isPrimary: false;
};
