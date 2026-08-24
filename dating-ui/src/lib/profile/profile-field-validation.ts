import type { MeProfileGender } from '@/lib/api/me-profile-api';

export type PartnerGendersValidationError = 'partnerGendersRequired';

export function validatePartnerGendersNonEmpty(
  desiredPartnerGenders: readonly MeProfileGender[],
): { ok: true } | { ok: false; error: PartnerGendersValidationError } {
  if (desiredPartnerGenders.length === 0) {
    return { ok: false, error: 'partnerGendersRequired' };
  }
  return { ok: true };
}

export type GenderAdvanceValidationError = 'genderInvalidForAdvance';

export function validateGenderForOnboardingAdvance(
  gender: string,
): { ok: true } | { ok: false; error: GenderAdvanceValidationError } {
  if (!gender.trim() || gender === 'PREFER_NOT_TO_SAY') {
    return { ok: false, error: 'genderInvalidForAdvance' };
  }
  return { ok: true };
}
