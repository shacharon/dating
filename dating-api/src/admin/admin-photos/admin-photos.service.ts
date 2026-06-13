import {
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserProfilePhotoStatus } from '@prisma/client';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PHOTO_STORAGE } from '../../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../../photo-storage/photo-storage.types';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ListPendingPhotosResponseDto,
  PendingPhotoListItemDto,
} from './dto/list-pending-photos.dto';
import {
  ModeratePhotoResponseDto,
  PhotoModerationDecision,
  type ModeratePhotoDto,
} from './dto/moderate-photo.dto';

function adminPhotoFileUrl(photoId: string): string {
  return `/api/v1/admin/photos/${encodeURIComponent(photoId)}/file`;
}

@Injectable()
export class AdminPhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
  ) {}

  async listPending(
    limit = 50,
    cursor?: string,
  ): Promise<ListPendingPhotosResponseDto> {
    const take = Math.min(Math.max(limit, 1), 100);
    let cursorRow: { id: string; createdAt: Date } | null = null;

    if (cursor?.trim()) {
      const row = await this.prisma.userProfilePhoto.findUnique({
        where: { id: cursor.trim() },
        select: { id: true, createdAt: true, status: true },
      });
      if (row?.status === UserProfilePhotoStatus.PENDING) {
        cursorRow = { id: row.id, createdAt: row.createdAt };
      }
    }

    const rows = await this.prisma.userProfilePhoto.findMany({
      where: {
        status: UserProfilePhotoStatus.PENDING,
        ...(cursorRow
          ? {
              OR: [
                { createdAt: { gt: cursorRow.createdAt } },
                {
                  createdAt: cursorRow.createdAt,
                  id: { gt: cursorRow.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: take + 1,
      include: {
        profile: { select: { userId: true } },
      },
    });

    const page = rows.slice(0, take);
    const items: PendingPhotoListItemDto[] = page.map((row) => ({
      id: row.id,
      profileId: row.profileId,
      userId: row.profile.userId,
      createdAt: row.createdAt.toISOString(),
      mimeType: row.mimeType,
      originalFileName: row.originalFileName,
      fileUrl: adminPhotoFileUrl(row.id),
    }));

    return {
      items,
      nextCursor: rows.length > take ? page[page.length - 1]!.id : null,
    };
  }

  async getPhotoFile(
    photoId: string,
  ): Promise<{ contentType: string; content: Buffer }> {
    const row = await this.prisma.userProfilePhoto.findUnique({
      where: { id: photoId },
      select: { mimeType: true, storageKey: true },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found.',
      });
    }
    const content = await this.photoStorage.read(row.storageKey);
    if (!content) {
      throw new NotFoundException({
        error: 'photo_file_not_found',
        message: 'Photo file is missing from storage.',
      });
    }
    return { contentType: row.mimeType, content };
  }

  async moderatePhoto(
    adminUserId: string,
    photoId: string,
    body: ModeratePhotoDto,
  ): Promise<ModeratePhotoResponseDto> {
    const row = await this.prisma.userProfilePhoto.findUnique({
      where: { id: photoId },
      include: { profile: { select: { userId: true } } },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'photo_not_found',
        message: 'Photo was not found.',
      });
    }
    if (row.status !== UserProfilePhotoStatus.PENDING) {
      throw new UnprocessableEntityException({ error: 'photo_not_pending' });
    }

    const ownerUserId = row.profile.userId;
    const decision =
      body.decision === PhotoModerationDecision.APPROVE ? 'approve' : 'reject';

    const updated =
      body.decision === PhotoModerationDecision.APPROVE
        ? await this.approvePendingPhoto(row.id, row.profileId)
        : await this.rejectPendingPhoto(
            row.id,
            body.rejectionReason?.trim() || null,
          );

    this.obs.trace(
      `event=photo_moderation_decided adminUserId=${adminUserId} photoId=${photoId} profileId=${row.profileId} decision=${decision}`,
      ErrorCodes.ADMIN_PHOTO_MODERATION_DECIDED,
    );
    this.analytics.track(ownerUserId, ProductAnalyticsEvents.PHOTO_MODERATION_DECIDED, {
      decision,
    });

    return {
      id: updated.id,
      profileId: updated.profileId,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      isPrimary: updated.isPrimary,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private async approvePendingPhoto(photoId: string, profileId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existingPrimary = await tx.userProfilePhoto.findFirst({
        where: {
          profileId,
          status: UserProfilePhotoStatus.APPROVED,
          isPrimary: true,
        },
        select: { id: true },
      });
      const shouldPrimary = !existingPrimary;

      return tx.userProfilePhoto.update({
        where: { id: photoId },
        data: {
          status: UserProfilePhotoStatus.APPROVED,
          moderationProvider: 'manual',
          moderationResultJson: { decision: 'approved' },
          rejectionReason: null,
          isPrimary: shouldPrimary,
        },
      });
    });
  }

  private async rejectPendingPhoto(
    photoId: string,
    rejectionReason: string | null,
  ) {
    return this.prisma.userProfilePhoto.update({
      where: { id: photoId },
      data: {
        status: UserProfilePhotoStatus.REJECTED,
        moderationProvider: 'manual',
        moderationResultJson: { decision: 'rejected' },
        rejectionReason,
        isPrimary: false,
      },
    });
  }
}
