import type { UserProfile, UserProfilePreference } from '@prisma/client';

/** `UserProfile` row with joined preference (may be null). */
export type UserProfileWithPreference = UserProfile & {
  preference: UserProfilePreference | null;
};

/** Narrow candidate row used by the legacy GET /me/profile/matches path. */
export type LegacyProfileMatchCandidateRow = Pick<
  UserProfile,
  | 'id'
  | 'birthDate'
  | 'gender'
  | 'desiredPartnerGenders'
  | 'city'
  | 'country'
  | 'locationLabel'
  | 'aboutMe'
  | 'aboutPartner'
  | 'aboutRelationship'
  | 'analyzedAt'
> & {
  _count: { evaluations: number };
  photos: Array<{ id: string; isPrimary: boolean }>;
};
