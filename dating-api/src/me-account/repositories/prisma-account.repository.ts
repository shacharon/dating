import { Injectable } from '@nestjs/common';
import {
  MessageStatus,
  MutualMatchStatus,
  Prisma,
  UserProfileOnboardingStep,
  UserProfileStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  scrubbedDeletedUserEmail,
  scrubbedDeletedUserGoogleId,
} from '../account-scrub.helpers';
import type { IAccountRepository } from './account.repository';

@Injectable()
export class PrismaAccountRepository implements IAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveUser(
    userId: string,
  ): Promise<{ id: string; deletedAt: Date | null } | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });
  }

  async findProfileIdByUserId(userId: string): Promise<string | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  listPhotoStorageKeys(
    profileId: string,
  ): Promise<Array<{ id: string; storageKey: string }>> {
    return this.prisma.userProfilePhoto.findMany({
      where: { profileId },
      select: { id: true, storageKey: true },
    });
  }

  async scrubAndSoftDeleteAccount(args: {
    userId: string;
    profileId: string | null;
    now: Date;
  }): Promise<void> {
    const { userId, profileId, now } = args;
    await this.prisma.$transaction(async (tx) => {
      if (profileId) {
        await tx.userProfilePhoto.deleteMany({ where: { profileId } });
        await tx.userProfileEvaluation.deleteMany({ where: { profileId } });
        await tx.userProfileSignal.deleteMany({ where: { profileId } });
        await tx.userProfileInterest.deleteMany({ where: { profileId } });
        await tx.userProfilePreference.deleteMany({ where: { profileId } });
        await tx.userProfile.update({
          where: { id: profileId },
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
      await tx.userContentViolation.deleteMany({ where: { userId } });
      if (profileId) {
        await tx.matchFeedback.deleteMany({
          where: { matchProfileId: profileId },
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
  }
}
