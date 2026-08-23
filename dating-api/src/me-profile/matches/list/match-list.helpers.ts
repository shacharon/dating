import { MatchActionType, type UserProfileStatus } from '@prisma/client';
import { ErrorCodes } from '../../../logging/error-codes';
import type { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import type { ProductProfilePartnerGenderPreferenceSource } from '../../contracts/user-profile-matching-bridge.contract';
import { MatchCandidateNotFoundError } from '../support/me-matches.errors';

export const STATUS_ANALYZED = 'ANALYZED' as UserProfileStatus;

export function matchActionToYourAction(
  action: MatchActionType | null | undefined,
): 'LIKE' | 'PASS' | 'BLOCK' | null {
  if (action === MatchActionType.LIKE) return 'LIKE';
  if (action === MatchActionType.PASS) return 'PASS';
  if (action === MatchActionType.BLOCK) return 'BLOCK';
  return null;
}

/**
 * Partner-gender read path for `/api/v1/me/matches` only: prefer `UserProfilePreference.acceptedPartnerGenders`
 * when the joined row exists; otherwise emit a trace and fall back to `UserProfile.desiredPartnerGenders` JSON
 * inside {@link buildProductProfileMatchingBridge}.
 */
export function partnerGenderSourceForMeMatchesRow(
  row: { id: string; preference?: { acceptedPartnerGenders: string[] } | null },
  obs: StructuredObservabilityService,
): ProductProfilePartnerGenderPreferenceSource | undefined {
  if (row.preference != null) {
    return {
      kind: 'preference',
      acceptedPartnerGenders: row.preference.acceptedPartnerGenders,
    };
  }
  obs.trace(
    `event=me_matches_partner_genders_legacy_json profileId=${row.id} reason=missing_UserProfilePreference_row_reads_UserProfile_desiredPartnerGenders`,
    ErrorCodes.ME_MATCHES_PARTNER_GENDER_LEGACY_JSON,
  );
  return undefined;
}

export function pickApprovedPrimaryPhotoId(
  photos: ReadonlyArray<{ id: string; isPrimary: boolean }>,
): string | null {
  const primary = photos.find((p) => p.isPrimary);
  return primary?.id ?? null;
}

export function assertCandidateHasApprovedPhotosInRow(candidate: {
  photos?: ReadonlyArray<unknown>;
}): void {
  if ((candidate.photos ?? []).length < 1) {
    throw new MatchCandidateNotFoundError();
  }
}
