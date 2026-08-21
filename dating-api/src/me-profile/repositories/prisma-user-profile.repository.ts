import { Injectable } from '@nestjs/common';
import { Prisma, type UserProfile, UserProfileStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateMeProfileDto, PatchMeProfileDto } from '../me-profile.dto';
import { ProfilePreferenceService } from '../profile/profile-preference.service';
import type { IUserProfileRepository } from './user-profile.repository';
import type {
  LegacyProfileMatchCandidateRow,
  UserProfileWithPreference,
} from './user-profile.repository.types';

@Injectable()
export class PrismaUserProfileRepository implements IUserProfileRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly preference: ProfilePreferenceService,
  ) {}

  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.prisma.userProfile.findUnique({ where: { userId } });
  }

  async findByUserIdWithPreference(
    userId: string,
  ): Promise<UserProfileWithPreference | null> {
    return this.prisma.userProfile.findUnique({
      where: { userId },
      include: { preference: true },
    });
  }

  async isNicknameTaken(
    nickname: string,
    excludeProfileId: string | null,
  ): Promise<boolean> {
    const taken = await this.prisma.userProfile.findFirst({
      where: {
        nickname,
        ...(excludeProfileId ? { NOT: { id: excludeProfileId } } : {}),
      },
      select: { id: true },
    });
    return taken != null;
  }

  async createWithPreference(args: {
    userId: string;
    profileData: Prisma.UserProfileCreateInput;
    preferenceBody: CreateMeProfileDto | PatchMeProfileDto;
  }): Promise<UserProfile> {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.userProfile.create({
        data: args.profileData,
      });
      await this.preference.upsertPreference(
        tx,
        created.id,
        args.preferenceBody,
      );
      return created;
    });
  }

  async updateByUserIdWithPreference(args: {
    userId: string;
    profileId: string;
    profileData: Prisma.UserProfileUpdateInput | null;
    preferenceBody: CreateMeProfileDto | PatchMeProfileDto;
  }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      if (
        args.profileData != null &&
        Object.keys(args.profileData).length > 0
      ) {
        await tx.userProfile.update({
          where: { userId: args.userId },
          data: args.profileData,
        });
      }
      await this.preference.upsertPreference(
        tx,
        args.profileId,
        args.preferenceBody,
      );
    });
  }

  async updateByUserId(
    userId: string,
    data: Prisma.UserProfileUpdateInput,
  ): Promise<UserProfile> {
    return this.prisma.userProfile.update({
      where: { userId },
      data,
    });
  }

  async findAnalysisStatusFieldsByUserId(userId: string): Promise<{
    status: UserProfileStatus;
    submittedAt: Date | null;
    analyzedAt: Date | null;
    lastAnalysisError: string | null;
  } | null> {
    return this.prisma.userProfile.findUnique({
      where: { userId },
      select: {
        status: true,
        submittedAt: true,
        analyzedAt: true,
        lastAnalysisError: true,
      },
    });
  }

  async markAnalyzing(userId: string): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: { status: UserProfileStatus.ANALYZING },
    });
  }

  async markAnalysisFailed(
    userId: string,
    errorMessage: string,
  ): Promise<void> {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        status: UserProfileStatus.FAILED,
        lastAnalysisError: errorMessage.slice(0, 500),
      },
    });
  }

  async persistAnalysisSuccess(args: {
    userId: string;
    profileId: string;
    dbFirstColumns: Record<string, unknown>;
    evaluationVersion: string;
    evaluationJson: unknown;
    signals: Array<{
      signalKey: string;
      signalValue: number;
      evalVersion: string;
    }>;
    interests: Array<{
      tag: string;
      rank: number;
      source: string;
      evalVersion: string;
    }>;
  }): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.userProfile.update({
        where: { userId: args.userId },
        data: {
          status: UserProfileStatus.ANALYZED,
          analyzedAt: new Date(),
          lastAnalysisError: null,
          ...(args.dbFirstColumns as Prisma.UserProfileUpdateInput),
        },
      }),
      this.prisma.userProfileEvaluation.create({
        data: {
          profileId: args.profileId,
          version: args.evaluationVersion,
          evaluationJson: args.evaluationJson as Prisma.InputJsonValue,
        },
      }),
      this.prisma.userProfileSignal.deleteMany({
        where: { profileId: args.profileId },
      }),
      ...args.signals.map((signal) =>
        this.prisma.userProfileSignal.upsert({
          where: {
            profileId_signalKey: {
              profileId: args.profileId,
              signalKey: signal.signalKey,
            },
          },
          create: { profileId: args.profileId, ...signal },
          update: {
            signalValue: signal.signalValue,
            evalVersion: signal.evalVersion,
          },
        }),
      ),
      this.prisma.userProfileInterest.deleteMany({
        where: { profileId: args.profileId },
      }),
      ...args.interests.map((interest) =>
        this.prisma.userProfileInterest.create({
          data: { profileId: args.profileId, ...interest },
        }),
      ),
    ]);
  }

  findLegacyProfileMatchesViewer(userId: string): Promise<UserProfile | null> {
    return this.findByUserId(userId);
  }

  listLegacyAnalyzedCandidatesExcludingUser(
    userId: string,
  ): Promise<LegacyProfileMatchCandidateRow[]> {
    return this.prisma.userProfile.findMany({
      where: {
        userId: { not: userId },
        status: UserProfileStatus.ANALYZED,
      },
      select: {
        id: true,
        birthDate: true,
        gender: true,
        desiredPartnerGenders: true,
        city: true,
        country: true,
        locationLabel: true,
        aboutMe: true,
        aboutPartner: true,
        aboutRelationship: true,
        analyzedAt: true,
        _count: { select: { evaluations: true } },
        photos: {
          where: { status: 'APPROVED' },
          select: { id: true, isPrimary: true },
        },
      },
    });
  }
}
