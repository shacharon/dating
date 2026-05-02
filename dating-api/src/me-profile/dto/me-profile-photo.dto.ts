import type { UserProfilePhotoStatus } from '@prisma/client';

export interface MeProfilePhotoDto {
  id: string;
  profileId: string;
  storageKey: string;
  originalFileName: string | null;
  mimeType: string;
  sizeBytes: number;
  position: number;
  isPrimary: boolean;
  status: UserProfilePhotoStatus;
  moderationProvider: string | null;
  moderationResultJson: unknown | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
