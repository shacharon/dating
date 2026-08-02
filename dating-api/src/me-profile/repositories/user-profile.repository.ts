import type { Prisma, UserProfile, UserProfileStatus } from '@prisma/client';
import type {
  CreateMeProfileDto,
  PatchMeProfileDto,
} from '../me-profile.dto';
import type { UserProfileWithPreference } from './user-profile.repository.types';

export const USER_PROFILE_REPOSITORY = Symbol('USER_PROFILE_REPOSITORY');

/**
 * Port for the product `UserProfile` aggregate (row + preference dual-write).
 * Photo tables are intentionally out of scope.
 */
export interface IUserProfileRepository {
  findByUserId(userId: string): Promise<UserProfile | null>;

  findByUserIdWithPreference(
    userId: string,
  ): Promise<UserProfileWithPreference | null>;

  /** True when another profile already owns this nickname. */
  isNicknameTaken(
    nickname: string,
    excludeProfileId: string | null,
  ): Promise<boolean>;

  /**
   * Create DRAFT profile + preference upsert in one interactive transaction.
   * Throws Prisma P2002 through to caller (Crud maps nickname conflicts).
   */
  createWithPreference(args: {
    userId: string;
    profileData: Prisma.UserProfileCreateInput;
    preferenceBody: CreateMeProfileDto | PatchMeProfileDto;
  }): Promise<UserProfile>;

  /**
   * Optional profile field update + preference upsert in one transaction.
   * When `profileData` is null, only preference upsert runs.
   * Caller must short-circuit when neither profile nor pref fields change.
   */
  updateByUserIdWithPreference(args: {
    userId: string;
    profileId: string;
    profileData: Prisma.UserProfileUpdateInput | null;
    preferenceBody: CreateMeProfileDto | PatchMeProfileDto;
  }): Promise<void>;

  /** Status / submit path updates (no preference). */
  updateByUserId(
    userId: string,
    data: Prisma.UserProfileUpdateInput,
  ): Promise<UserProfile>;

  /**
   * Narrow select for getAnalysisStatusForUser.
   */
  findAnalysisStatusFieldsByUserId(userId: string): Promise<{
    status: UserProfileStatus;
    submittedAt: Date | null;
    analyzedAt: Date | null;
    lastAnalysisError: string | null;
  } | null>;
}
