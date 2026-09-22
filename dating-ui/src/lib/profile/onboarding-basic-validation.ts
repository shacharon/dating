import type { MeProfileGender } from '@/lib/api/me-profile-api';
import {
  validateGenderForOnboardingAdvance,
  validatePartnerGendersNonEmpty,
} from '@/lib/profile/profile-field-validation';

export type OnboardingLocationAdvance = {
  countryCode: string;
  usStateCode: string;
  cityId: string;
  /** True when the selected country has any city rows. */
  countryHasCities: boolean;
  /** True when the selected US state has city rows. Ignored outside the US. */
  stateHasCities: boolean;
};

export type OnboardingBasicAdvanceFields = {
  gender: string;
  desiredPartnerGenders: MeProfileGender[];
  location: OnboardingLocationAdvance;
};

export type OnboardingBasicAdvanceValidationError =
  | 'genderInvalidForAdvance'
  | 'partnerGendersRequired'
  | 'locationRequired';

export function locationSatisfied(location: OnboardingLocationAdvance): boolean {
  if (!location.countryCode) return false;
  if (location.countryCode === 'US') {
    if (!location.usStateCode) return false;
    if (location.stateHasCities) return Boolean(location.cityId);
    return true;
  }
  if (location.countryHasCities) return Boolean(location.cityId);
  return true;
}

export function validateOnboardingBasicAdvance(
  fields: OnboardingBasicAdvanceFields,
): { ok: true } | { ok: false; error: OnboardingBasicAdvanceValidationError } {
  const genderResult = validateGenderForOnboardingAdvance(fields.gender);
  if (!genderResult.ok) {
    return genderResult;
  }

  const partnerResult = validatePartnerGendersNonEmpty(fields.desiredPartnerGenders);
  if (!partnerResult.ok) return partnerResult;

  if (!locationSatisfied(fields.location)) {
    return { ok: false, error: 'locationRequired' };
  }
  return { ok: true };
}
