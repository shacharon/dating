import { describe, expect, it } from 'vitest';
import { validateOnboardingBasicAdvance } from '@/lib/profile/onboarding-basic-validation';

describe('onboarding-basic-validation', () => {
  it('returns gender error before partner genders error', () => {
    expect(
      validateOnboardingBasicAdvance({
        gender: '',
        desiredPartnerGenders: [],
      }),
    ).toEqual({ ok: false, error: 'genderInvalidForAdvance' });
  });

  it('returns partner genders error when gender is valid', () => {
    expect(
      validateOnboardingBasicAdvance({
        gender: 'MALE',
        desiredPartnerGenders: [],
      }),
    ).toEqual({ ok: false, error: 'partnerGendersRequired' });
  });

  it('accepts valid advance fields', () => {
    expect(
      validateOnboardingBasicAdvance({
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
      }),
    ).toEqual({ ok: true });
  });
});
