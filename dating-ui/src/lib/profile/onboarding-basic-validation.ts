import type { MeProfileGender } from '@/lib/api/me-profile-api';
import {
  validateGenderForOnboardingAdvance,
  validatePartnerGendersNonEmpty,
} from '@/lib/profile/profile-field-validation';

export type OnboardingBasicAdvanceFields = {
  gender: string;
  desiredPartnerGenders: MeProfileGender[];
};

export type OnboardingBasicAdvanceValidationError =
  | 'genderInvalidForAdvance'
  | 'partnerGendersRequired';

export function validateOnboardingBasicAdvance(
  fields: OnboardingBasicAdvanceFields,
): { ok: true } | { ok: false; error: OnboardingBasicAdvanceValidationError } {
  const genderResult = validateGenderForOnboardingAdvance(fields.gender);
  if (!genderResult.ok) {
    return genderResult;
  }

  return validatePartnerGendersNonEmpty(fields.desiredPartnerGenders);
}
