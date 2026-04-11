import type { ProfileGender, UserProfileStatus } from '@prisma/client';

/**
 * GET / POST / PATCH success body for `/api/v1/me/profile`.
 * Dates serialize to ISO 8601 strings in JSON responses.
 */
export class MeProfileResponseDto {
  id!: string;
  userId!: string;
  status!: UserProfileStatus;
  onboardingStep!: number;
  aboutMe!: string | null;
  aboutPartner!: string | null;
  aboutRelationship!: string | null;
  birthDate!: Date | null;
  gender!: ProfileGender | null;
  /** Parsed from stored JSON; `null` if unset or not a valid enum string array. */
  desiredPartnerGenders!: ProfileGender[] | null;
  city!: string | null;
  country!: string | null;
  locationLabel!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
