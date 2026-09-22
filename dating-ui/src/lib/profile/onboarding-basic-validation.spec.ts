import { describe, expect, it } from 'vitest';
import { validateOnboardingBasicAdvance } from '@/lib/profile/onboarding-basic-validation';

describe('onboarding-basic-validation', () => {
  it('returns gender error before partner genders error', () => {
    expect(
      validateOnboardingBasicAdvance({
        gender: '',
        desiredPartnerGenders: [],
        location: {
          countryCode: '',
          usStateCode: '',
          cityId: '',
          countryHasCities: false,
          stateHasCities: false,
        },
      }),
    ).toEqual({ ok: false, error: 'genderInvalidForAdvance' });
  });

  it('returns partner genders error when gender is valid', () => {
    expect(
      validateOnboardingBasicAdvance({
        gender: 'MALE',
        desiredPartnerGenders: [],
        location: {
          countryCode: 'JP',
          usStateCode: '',
          cityId: '',
          countryHasCities: false,
          stateHasCities: false,
        },
      }),
    ).toEqual({ ok: false, error: 'partnerGendersRequired' });
  });

  it('accepts a city, a country with no cities, and a US state with no cities', () => {
    const gender = {
      gender: 'MALE' as const,
      desiredPartnerGenders: ['FEMALE' as const],
    };
    expect(
      validateOnboardingBasicAdvance({
        ...gender,
        location: {
          countryCode: 'IL',
          usStateCode: '',
          cityId: 'city_IL_na_tel_aviv',
          countryHasCities: true,
          stateHasCities: false,
        },
      }),
    ).toEqual({ ok: true });
    expect(
      validateOnboardingBasicAdvance({
        ...gender,
        location: {
          countryCode: 'JP',
          usStateCode: '',
          cityId: '',
          countryHasCities: false,
          stateHasCities: false,
        },
      }),
    ).toEqual({ ok: true });
    expect(
      validateOnboardingBasicAdvance({
        ...gender,
        location: {
          countryCode: 'US',
          usStateCode: 'WY',
          cityId: '',
          countryHasCities: true,
          stateHasCities: false,
        },
      }),
    ).toEqual({ ok: true });
  });

  it('blocks continue when location is missing', () => {
    expect(
      validateOnboardingBasicAdvance({
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
        location: {
          countryCode: '',
          usStateCode: '',
          cityId: '',
          countryHasCities: false,
          stateHasCities: false,
        },
      }),
    ).toEqual({ ok: false, error: 'locationRequired' });
  });

  it('accepts valid advance fields', () => {
    expect(
      validateOnboardingBasicAdvance({
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
        location: {
          countryCode: 'JP',
          usStateCode: '',
          cityId: '',
          countryHasCities: false,
          stateHasCities: false,
        },
      }),
    ).toEqual({ ok: true });
  });
});
