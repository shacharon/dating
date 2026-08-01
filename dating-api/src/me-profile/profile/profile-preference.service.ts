import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { CreateMeProfileDto, PatchMeProfileDto } from '../me-profile.dto';
import {
  acceptedPartnerGendersFromDesiredJson,
  toPreferenceData,
} from './profile-write.helpers';

/** Phase F normalized `UserProfilePreference` dual-write. */
@Injectable()
export class ProfilePreferenceService {
  /**
   * Persists HG partner-preference fields to `UserProfilePreference` (normalized; Phase F).
   * Must use the same transaction client as the profile write so both tables commit or roll back together.
   */
  async upsertPreference(
    tx: Prisma.TransactionClient,
    profileId: string,
    body: CreateMeProfileDto | PatchMeProfileDto,
  ): Promise<void> {
    const prefData = toPreferenceData(body);
    if (prefData.acceptedPartnerGenders === undefined) {
      const snap = await tx.userProfile.findUnique({
        where: { id: profileId },
        select: { desiredPartnerGenders: true },
      });
      prefData.acceptedPartnerGenders = acceptedPartnerGendersFromDesiredJson(
        snap?.desiredPartnerGenders ?? null,
      );
    }
    await tx.userProfilePreference.upsert({
      where: { profileId },
      create: {
        profileId,
        ...prefData,
      } as Prisma.UserProfilePreferenceUncheckedCreateInput,
      update: prefData as Prisma.UserProfilePreferenceUncheckedUpdateInput,
    });
  }
}
