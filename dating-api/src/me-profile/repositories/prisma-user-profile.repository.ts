import { Injectable } from '@nestjs/common';
import type { Prisma, UserProfile, UserProfileStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateMeProfileDto,
  PatchMeProfileDto,
} from '../me-profile.dto';
import { ProfilePreferenceService } from '../profile/profile-preference.service';
import type { IUserProfileRepository } from './user-profile.repository';
import type { UserProfileWithPreference } from './user-profile.repository.types';

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
      if (args.profileData != null && Object.keys(args.profileData).length > 0) {
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
}
