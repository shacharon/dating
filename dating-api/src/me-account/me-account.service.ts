import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../photo-storage/photo-storage.types';
import {
  ACCOUNT_REPOSITORY,
  type IAccountRepository,
} from './repositories/account.repository';

export function scrubbedDeletedUserEmail(userId: string): string {
  return `deleted+${userId}@deleted.invalid`;
}

export function scrubbedDeletedUserGoogleId(userId: string): string {
  return `deleted+${userId}`;
}

@Injectable()
export class MeAccountService {
  constructor(
    @Inject(ACCOUNT_REPOSITORY)
    private readonly accounts: IAccountRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
    @Inject(PHOTO_STORAGE) private readonly photoStorage: PhotoStorage,
  ) {}

  async deleteAccountForUser(
    userId: string,
    confirmation: string,
  ): Promise<void> {
    if (confirmation !== 'DELETE') {
      throw new BadRequestException({
        error: 'account_delete_confirmation_invalid',
      });
    }

    const user = await this.accounts.findActiveUser(userId);
    if (!user || user.deletedAt != null) {
      throw new NotFoundException({ error: 'account_already_deleted' });
    }

    this.analytics.track(userId, ProductAnalyticsEvents.ACCOUNT_DELETED, {});

    const profileId = await this.accounts.findProfileIdByUserId(userId);

    if (profileId) {
      const photos = await this.accounts.listPhotoStorageKeys(profileId);
      await Promise.all(
        photos.map(async (photo) => {
          try {
            await this.photoStorage.delete(photo.storageKey);
          } catch {
            this.obs.trace(
              `account delete photo storage failed photoId=${photo.id} storageKey=${photo.storageKey}`,
              ErrorCodes.ACCOUNT_DELETE_PHOTO_STORAGE_FAILED,
            );
          }
        }),
      );
    }

    const now = new Date();

    await this.accounts.scrubAndSoftDeleteAccount({
      userId,
      profileId,
      now,
    });

    this.obs.trace(
      `account deleted userId=${userId}`,
      ErrorCodes.ACCOUNT_DELETE_SUCCESS,
    );
  }
}
