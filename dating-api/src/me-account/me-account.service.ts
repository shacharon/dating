import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageStatus,
  MutualMatchStatus,
  Prisma,
  UserProfileOnboardingStep,
  UserProfileStatus,
  UserStatus,
} from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { PHOTO_STORAGE } from '../photo-storage/photo-storage.module';
import type { PhotoStorage } from '../photo-storage/photo-storage.types';
import { PrismaService } from '../prisma/prisma.service';

export function scrubbedDeletedUserEmail(userId: string): string {
  return `deleted+${userId}@deleted.invalid`;
}

export function scrubbedDeletedUserGoogleId(userId: string): string {
  return `deleted+${userId}`;
}

@Injectable()
export class MeAccountService {
  constructor(
    private readonly prisma: PrismaService,
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

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt != null) {
      throw new NotFoundException({ error: 'account_already_deleted' });
    }

    this.analytics.track(userId, ProductAnalyticsEvents.ACCOUNT_DELETED, {});

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
    });

    if (profile) {
      const photos = await this.prisma.userProfilePhoto.findMany({
        where: { profileId: profile.id },
      });
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

    await this.prisma.$transaction(async (tx) => {
      if (profile) {
        await tx.userProfilePhoto.deleteMany({
          where: { profileId: profile.id },
        });
        await tx.userProfileEvaluation.deleteMany({
          where: { profileId: profile.id },
        });
        await tx.userProfileSignal.deleteMany({
          where: { profileId: profile.id },
        });
        await tx.userProfileInterest.deleteMany({
          where: { profileId: profile.id },
        });
        await tx.userProfilePreference.deleteMany({
          where: { profileId: profile.id },
        });
        await tx.userProfile.update({
          where: { id: profile.id },
          data: {
            name: '',
            nickname: null,
            status: UserProfileStatus.DRAFT,
            onboardingStep: UserProfileOnboardingStep.BASIC,
            onboardingCompletedAt: null,
            aboutMe: null,
            aboutPartner: null,
            aboutRelationship: null,
            birthDate: null,
            desiredPartnerGenders: Prisma.DbNull,
            city: null,
            country: null,
            locationLabel: null,
            submittedAt: null,
            analyzedAt: null,
            lastAnalysisError: null,
            childrenStatus: null,
            wantsChildren: null,
            smokingFrequency: null,
            alcoholUse: null,
            education: null,
            religion: null,
            interestsTop: [],
            sigEmotionalDepth: null,
            sigLifestylePace: null,
            sigConflictStyle: null,
            sigIndependence: null,
            sigSocialBattery: null,
          },
        });
      }

      await tx.matchAction.deleteMany({ where: { actorUserId: userId } });
      await tx.matchFeedback.deleteMany({ where: { userId } });
      if (profile) {
        await tx.matchFeedback.deleteMany({
          where: { matchProfileId: profile.id },
        });
      }

      await tx.mutualMatch.updateMany({
        where: {
          status: MutualMatchStatus.ACTIVE,
          OR: [{ userId1: userId }, { userId2: userId }],
        },
        data: {
          status: MutualMatchStatus.UNMATCHED,
          unmatchedAt: now,
          unmatchedByUserId: userId,
        },
      });

      await tx.message.updateMany({
        where: { senderId: userId },
        data: {
          text: '[deleted user]',
          status: MessageStatus.DELETED,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          deletedAt: now,
          status: UserStatus.DISABLED,
          email: scrubbedDeletedUserEmail(userId),
          googleId: scrubbedDeletedUserGoogleId(userId),
          displayName: null,
          avatarUrl: null,
          emailNotificationsEnabled: false,
          inAppNotificationsEnabled: false,
        },
      });
    });

    this.obs.trace(
      `account deleted userId=${userId}`,
      ErrorCodes.ACCOUNT_DELETE_SUCCESS,
    );
  }
}
