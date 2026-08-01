import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ProfileGender,
  UserProfile,
  UserProfileStatus,
} from '@prisma/client';
import { ErrorCodes } from '../../logging/error-codes';
import { markHttpExceptionObservabilityLogged } from '../../logging/observability-http.exception';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { isContentModerationEnabled } from '../../content-moderation/content-moderation.types';
import {
  MATCH_LIST_RANK_QUEUE_PORT,
  type MatchListRankQueuePort,
} from '../../workers/match-list-rank.ports';
import type {
  CreateMeProfileDto,
  MeProfileResponseDto,
  PatchMeProfileDto,
} from '../me-profile.dto';
import { ProfileModerationService } from './profile-moderation.service';
import { ProfilePreferenceService } from './profile-preference.service';
import {
  applyOnboardingCompletionToWriteData,
  assertOnboardingStepCoherent,
  normalizeNicknameValue,
  toPreferenceData,
  toPrismaWritableData,
  toResponse,
} from './profile-write.helpers';

/** Read/write path for the product `UserProfile` row (create, patch, get, nickname). */
@Injectable()
export class ProfileCrudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly profileModeration: ProfileModerationService,
    private readonly preference: ProfilePreferenceService,
    @Inject(MATCH_LIST_RANK_QUEUE_PORT)
    private readonly matchListRankQueue: MatchListRankQueuePort,
  ) {}

  async requireProfileForUser(userId: string): Promise<UserProfile> {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account. Use POST /api/v1/me/profile to create one.',
      });
    }
    return profile;
  }

  async assertNicknameAvailable(
    nickname: string,
    excludeProfileId: string | null,
  ): Promise<void> {
    const taken = await this.prisma.userProfile.findFirst({
      where: {
        nickname,
        ...(excludeProfileId ? { NOT: { id: excludeProfileId } } : {}),
      },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException({
        error: 'nickname_taken',
        message: 'This nickname is already in use.',
      });
    }
  }

  async getForUser(userId: string): Promise<MeProfileResponseDto | null> {
    const row = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { preference: true },
    });
    return row ? toResponse(row, row.preference) : null;
  }

  async createForUser(
    userId: string,
    body: CreateMeProfileDto,
  ): Promise<MeProfileResponseDto> {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
    });
    if (existing) {
      this.obs.error(
        'me profile POST: profile already exists for user',
        ErrorCodes.ME_PROFILE_CREATE_CONFLICT,
      );
      throw new ConflictException({
        error: 'profile_already_exists',
        message:
          'A profile already exists for this account. Use PATCH /api/v1/me/profile to update it.',
      });
    }

    if (isContentModerationEnabled()) {
      await this.profileModeration.assertProfileEditAllowed(userId);
      await this.profileModeration.moderateProfileTextFields(userId, body);
    }

    assertOnboardingStepCoherent(null, body);

    const createNickname =
      body.nickname !== undefined
        ? normalizeNicknameValue(body.nickname)
        : undefined;
    if (createNickname) {
      await this.assertNicknameAvailable(createNickname, null);
    }

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const writable = toPrismaWritableData(body);
        if (body.gender === undefined) {
          writable.gender = ProfileGender.PREFER_NOT_TO_SAY;
        }
        applyOnboardingCompletionToWriteData(writable, body, null);
        const created = await tx.userProfile.create({
          data: {
            user: { connect: { id: userId } },
            status: UserProfileStatus.DRAFT,
            ...writable,
          } as Prisma.UserProfileCreateInput,
        });
        await this.preference.upsertPreference(tx, created.id, body);
        return created;
      });
      this.obs.trace(
        `me profile created profileId=${row.id}`,
        ErrorCodes.ME_PROFILE_CREATE_SUCCESS,
      );
      await this.matchListRankQueue.enqueueRebuild(
        userId,
        'preferences_changed',
      );
      const full = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: { preference: true },
      });
      if (!full) {
        const ex = new InternalServerErrorException({
          message: 'Profile could not be loaded after create',
        });
        markHttpExceptionObservabilityLogged(ex);
        throw ex;
      }
      return toResponse(full, full.preference);
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const target = e.meta?.target;
        if (Array.isArray(target) && target.includes('nickname')) {
          throw new ConflictException({
            error: 'nickname_taken',
            message: 'This nickname is already in use.',
          });
        }
      }
      this.obs.error(
        'me profile create persistence failed',
        ErrorCodes.ME_PROFILE_SAVE_FAILED,
        e,
      );
      const ex = new InternalServerErrorException({
        message: 'Profile could not be created',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }

  async patchForUser(
    userId: string,
    body: PatchMeProfileDto,
  ): Promise<MeProfileResponseDto> {
    const existing = await this.prisma.userProfile.findUnique({
      where: { userId },
      include: { preference: true },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'profile_not_found',
        message:
          'No profile exists for this account. Use POST /api/v1/me/profile to create one.',
      });
    }

    if (isContentModerationEnabled()) {
      await this.profileModeration.assertProfileEditAllowed(userId);
      await this.profileModeration.moderateProfileTextFields(userId, body);
    }

    assertOnboardingStepCoherent(existing, body);

    const data = toPrismaWritableData(body);
    if (body.nickname !== undefined) {
      const nextNickname = normalizeNicknameValue(body.nickname);
      const currentNickname = normalizeNicknameValue(existing.nickname);
      if (nextNickname === currentNickname) {
        delete data.nickname;
      } else if (nextNickname !== null) {
        await this.assertNicknameAvailable(nextNickname, existing.id);
      }
    }
    applyOnboardingCompletionToWriteData(
      data,
      body,
      existing.onboardingCompletedAt,
    );
    const prefDelta = toPreferenceData(body);
    const hasProfileFieldChanges = Object.keys(data).length > 0;
    const hasPrefChanges = Object.keys(prefDelta).length > 0;

    if (!hasProfileFieldChanges && !hasPrefChanges) {
      this.obs.trace(
        `me profile patched (no field changes) profileId=${existing.id}`,
        ErrorCodes.ME_PROFILE_PATCH_SUCCESS,
      );
      return toResponse(existing, existing.preference);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (hasProfileFieldChanges) {
          await tx.userProfile.update({
            where: { userId },
            data,
          });
        }
        await this.preference.upsertPreference(tx, existing.id, body);
      });
      if (hasPrefChanges) {
        await this.matchListRankQueue.enqueueRebuild(
          userId,
          'preferences_changed',
        );
      }
      const full = await this.prisma.userProfile.findUnique({
        where: { userId },
        include: { preference: true },
      });
      if (!full) {
        const ex = new InternalServerErrorException({
          message: 'Profile could not be loaded after patch',
        });
        markHttpExceptionObservabilityLogged(ex);
        throw ex;
      }
      this.obs.trace(
        `me profile patched profileId=${full.id}`,
        ErrorCodes.ME_PROFILE_PATCH_SUCCESS,
      );
      return toResponse(full, full.preference);
    } catch (e: unknown) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const target = e.meta?.target;
        if (Array.isArray(target) && target.includes('nickname')) {
          throw new ConflictException({
            error: 'nickname_taken',
            message: 'This nickname is already in use.',
          });
        }
      }
      this.obs.error(
        'me profile patch persistence failed',
        ErrorCodes.ME_PROFILE_SAVE_FAILED,
        e,
      );
      const ex = new InternalServerErrorException({
        message: 'Profile could not be saved',
      });
      markHttpExceptionObservabilityLogged(ex);
      throw ex;
    }
  }
}
