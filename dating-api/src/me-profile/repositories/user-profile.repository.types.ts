import type { UserProfile, UserProfilePreference } from '@prisma/client';

/** `UserProfile` row with joined preference (may be null). */
export type UserProfileWithPreference = UserProfile & {
  preference: UserProfilePreference | null;
};
