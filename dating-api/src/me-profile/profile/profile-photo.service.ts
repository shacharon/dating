import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, UserProfilePhotoStatus } from '@prisma/client';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PHOTO_STORAGE } from '../../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../../photo-storage/photo-storage.types';
import { loadPhotoStorageConfig } from '../../photo-storage/photo-storage.config';
import { PhotoModerationQueueService } from '../../workers/photo-moderation.worker';
import type { MeProfilePhotoDto } from '../me-profile.dto';
import { ProfileCrudService } from './profile-crud.service';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_COUNT,
  type UploadedPhotoFile,
} from './profile-photo.constants';

/** Profile photo lifecycle: list, upload (+ moderation enqueue), delete, primary, file read. */
@Injectable()
export class ProfilePhotoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
    private readonly analytics: AnalyticsService,
    private readonly photoModerationQueue: PhotoModerationQueueService,
    private readonly crud: ProfileCrudService,
  ) {}

  private toPhotoDto(row: {
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
    moderationResultJson: Prisma.JsonValue | null;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): MeProfilePhotoDto {
    return {
      ...row,
      moderationResultJson: row.moderationResultJson as unknown | null,
    };
  }

  async listPhotosForUser(userId: string): Promise<MeProfilePhotoDto[]> {
    const profile = await this.crud.requireProfileForUser(userId);
    const rows = await this.prisma.userProfilePhoto.findMany({
      where: { profileId: profile.id },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toPhotoDto(r));
  }

  async uploadPhotoForUser(
    userId: string,
    file: UploadedPhotoFile | undefined,
  ): Promise<MeProfilePhotoDto> {
    if (!file) {
      throw new UnprocessableEntityException({
        error: 'photo_file_required',
        message: 'Attach a multipart file field named "file".',
      });
    }
    if (!ALLOWED_PHOTO_MIME_TYPES.has(file.mimetype)) {
      throw new UnprocessableEntityException({
        error: 'photo_invalid_mime_type',
        message: `Allowed mime types: ${[...ALLOWED_PHOTO_MIME_TYPES].join(', ')}`,
      });
    }
    if (file.size > PHOTO_MAX_BYTES) {
      throw new UnprocessableEntityException({
        error: 'photo_file_too_large',
        message: 'Max file size is 5MB.',
      });
    }

    const profile = await this.crud.requireProfileForUser(userId);
    const existing = await this.prisma.userProfilePhoto.findMany({
      where: { profileId: profile.id },
      orderBy: [{ position: 'asc' }],
      select: { id: true, position: true, status: true, isPrimary: true },
    });
    if (existing.length >= PHOTO_MAX_COUNT) {
      throw new UnprocessableEntityException({
        error: 'photo_limit_reached',
        message: `Max ${PHOTO_MAX_COUNT} photos per profile.`,
      });
    }
    const approvedExists = existing.some((p) => p.status === UserProfilePhotoStatus.APPROVED);
    const nextPosition = existing.length
      ? Math.max(...existing.map((p) => p.position)) + 1
      : 0;

    const autoApprove = process.env.PHOTO_MODERATION_AUTO_APPROVE === '1';
    const moderationDriver = loadPhotoStorageConfig().moderationDriver;
    const status = autoApprove
      ? UserProfilePhotoStatus.APPROVED
      : UserProfilePhotoStatus.PENDING;
    const moderationProvider = autoApprove
      ? 'stub'
      : moderationDriver === 'stub'
        ? 'manual_queue'
        : moderationDriver === 'mock'
          ? 'mock'
          : 'rekognition';
    const moderationResultJson = autoApprove
      ? { source: 'stub', decision: 'approved', reason: 'stub_auto_approve' }
      : Prisma.DbNull;
    const isPrimary = autoApprove && !approvedExists;
    const enqueueMl =
      !autoApprove &&
      (moderationDriver === 'rekognition' || moderationDriver === 'mock') &&
      status === UserProfilePhotoStatus.PENDING;

    const created = await this.prisma.userProfilePhoto.create({
      data: {
        profileId: profile.id,
        storageKey: 'pending://storage-key',
        originalFileName: file.originalname || null,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        position: nextPosition,
        status,
        moderationProvider,
        moderationResultJson,
        isPrimary,
      },
    });

    try {
      const storageKey = this.photoStorage.buildStorageKey({
        profileId: profile.id,
        photoId: created.id,
        mimeType: file.mimetype,
        originalFileName: file.originalname,
      });
      await this.photoStorage.save(storageKey, file.buffer);
      const updated = await this.prisma.userProfilePhoto.update({
        where: { id: created.id },
        data: { storageKey },
      });
      if (autoApprove && isPrimary) {
        await this.prisma.userProfilePhoto.updateMany({
          where: { profileId: profile.id, id: { not: created.id } },
          data: { isPrimary: false },
        });
      }
      if (status === UserProfilePhotoStatus.PENDING) {
        this.analytics.track(userId, ProductAnalyticsEvents.PHOTO_MODERATION_PENDING, {});
      }
      if (enqueueMl) {
        void this.photoModerationQueue
          .enqueueOrRunInline(updated.id)
          .catch(() => undefined);
      }
      return this.toPhotoDto(updated);
    } catch (e) {
      await this.prisma.userProfilePhoto
        .delete({ where: { id: created.id } })
        .catch(() => undefined);
      throw e;
    }
  }

  async deletePhotoForUser(
    userId: string,
    photoId: string,
  ): Promise<{ deleted: true }> {
    const profile = await this.crud.requireProfileForUser(userId);
    const row = await this.prisma.userProfilePhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found for this profile.',
      });
    }

    await this.prisma.userProfilePhoto.delete({ where: { id: row.id } });
    await this.photoStorage.delete(row.storageKey).catch(() => undefined);

    if (row.isPrimary) {
      const promote = await this.prisma.userProfilePhoto.findFirst({
        where: { profileId: profile.id, status: UserProfilePhotoStatus.APPROVED },
        orderBy: [{ position: 'asc' }],
      });
      if (promote) {
        await this.prisma.$transaction(async (tx) => {
          await tx.userProfilePhoto.updateMany({
            where: { profileId: profile.id },
            data: { isPrimary: false },
          });
          await tx.userProfilePhoto.update({
            where: { id: promote.id },
            data: { isPrimary: true },
          });
        });
      }
    }
    return { deleted: true };
  }

  async setPrimaryPhotoForUser(
    userId: string,
    photoId: string,
  ): Promise<MeProfilePhotoDto> {
    const profile = await this.crud.requireProfileForUser(userId);
    const row = await this.prisma.userProfilePhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found for this profile.',
      });
    }
    if (row.status !== UserProfilePhotoStatus.APPROVED) {
      throw new UnprocessableEntityException({
        error: 'photo_not_approved',
        message: 'Only approved photos can be set as primary.',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userProfilePhoto.updateMany({
        where: { profileId: profile.id },
        data: { isPrimary: false },
      });
      return tx.userProfilePhoto.update({
        where: { id: row.id },
        data: { isPrimary: true },
      });
    });
    return this.toPhotoDto(updated);
  }

  async getPhotoFileForUser(
    userId: string,
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    const profile = await this.crud.requireProfileForUser(userId);
    const row = await this.prisma.userProfilePhoto.findFirst({
      where: { id: photoId, profileId: profile.id },
      select: { id: true, profileId: true, storageKey: true, mimeType: true },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found for this profile.',
      });
    }
    const content = await this.photoStorage.read(row.storageKey);
    if (!content) {
      throw new NotFoundException({
        error: 'photo_file_not_found',
        message: 'Photo file is missing from local storage.',
      });
    }
    return { contentType: row.mimeType, content };
  }
}
