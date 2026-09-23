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

export type OnboardingFactsAdvanceFields = OnboardingBasicAdvanceFields & {
  birthDate: string;
};

export type OnboardingBasicAdvanceValidationError =
  | 'genderInvalidForAdvance'
  | 'partnerGendersRequired'
  | 'locationRequired';

export type OnboardingFactsAdvanceValidationError =
  | OnboardingBasicAdvanceValidationError
  | 'birthDateRequired';

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

export function birthDateSatisfied(birthDate: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim());
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

/** Sprint 75 Story 3 — facts screen requires birth date as well. */
export function validateOnboardingFactsAdvance(
  fields: OnboardingFactsAdvanceFields,
): { ok: true } | { ok: false; error: OnboardingFactsAdvanceValidationError } {
  const base = validateOnboardingBasicAdvance(fields);
  if (!base.ok) return base;
  if (!birthDateSatisfied(fields.birthDate)) {
    return { ok: false, error: 'birthDateRequired' };
  }
  return { ok: true };
}

export type FactsMissingKey =
  | 'gender'
  | 'lookingFor'
  | 'location'
  | 'birthDate';

export function listFactsMissing(
  fields: OnboardingFactsAdvanceFields,
): FactsMissingKey[] {
  const missing: FactsMissingKey[] = [];
  if (!validateGenderForOnboardingAdvance(fields.gender).ok) {
    missing.push('gender');
  }
  if (!validatePartnerGendersNonEmpty(fields.desiredPartnerGenders).ok) {
    missing.push('lookingFor');
  }
  if (!locationSatisfied(fields.location)) {
    missing.push('location');
  }
  if (!birthDateSatisfied(fields.birthDate)) {
    missing.push('birthDate');
  }
  return missing;
}
