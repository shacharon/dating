import { describe, expect, it } from 'vitest';
import {
  buildCreatePayload,
  buildPatchPayload,
  emptyProfileFormState,
  isProfileFormEmpty,
  profileToFormFields,
} from '@/lib/profile/profile-form';
import type { MeProfileDto, MeProfileGender } from '@/lib/api/me-profile-api';

const baseProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'BASIC',
  nickname: 'Sam',
  aboutMe: 'Hello',
  aboutPartner: 'Kind',
  aboutRelationship: 'Long term',
  birthDate: '1991-06-15T00:00:00.000Z',
  gender: 'FEMALE',
  desiredPartnerGenders: ['MALE', 'NON_BINARY'],
  city: ' TLV ',
  country: 'IL',
  locationLabel: 'Tel Aviv',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('profile-form', () => {
  it('profileToFormFields maps API row to form state', () => {
    expect(profileToFormFields(baseProfile)).toEqual({
      nickname: 'Sam',
      aboutMe: 'Hello',
      aboutPartner: 'Kind',
      aboutRelationship: 'Long term',
      birthDate: '1991-06-15',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE', 'NON_BINARY'],
      city: ' TLV ',
      country: 'IL',
      locationLabel: 'Tel Aviv',
    });
  });

  it('profileToFormFields maps nulls to empty defaults', () => {
    expect(
      profileToFormFields({
        ...baseProfile,
        nickname: null,
        aboutMe: null,
        aboutPartner: null,
        aboutRelationship: null,
        birthDate: null,
        gender: null,
        desiredPartnerGenders: null,
        city: null,
        country: null,
        locationLabel: null,
      }),
    ).toEqual({
      ...emptyProfileFormState(),
      nickname: '',
      aboutMe: '',
      aboutPartner: '',
      aboutRelationship: '',
    });
  });

  it('buildCreatePayload trims text and maps identity fields', () => {
    const s = {
      ...emptyProfileFormState(),
      aboutMe: '  x  ',
      aboutPartner: '  ',
      aboutRelationship: '\t',
      birthDate: '1990-01-02',
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'] as MeProfileGender[],
      city: ' Haifa ',
      country: ' IL ',
      locationLabel: ' Haifa IL ',
    };
    expect(buildCreatePayload(s)).toEqual({
      nickname: null,
      aboutMe: '  x  ',
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: '1990-01-02',
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'],
      city: 'Haifa',
      country: 'IL',
      locationLabel: 'Haifa IL',
    });
  });

  it('buildCreatePayload uses null for empty identity strings and no partner genders', () => {
    const s = emptyProfileFormState();
    expect(buildCreatePayload(s)).toEqual({
      nickname: null,
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      birthDate: null,
      gender: null,
      desiredPartnerGenders: null,
      city: null,
      country: null,
      locationLabel: null,
    });
  });

  it('buildPatchPayload matches create payload shape', () => {
    const s = { ...emptyProfileFormState(), aboutMe: 'a', aboutPartner: 'b', aboutRelationship: 'c' };
    expect(buildPatchPayload(s)).toEqual(buildCreatePayload(s));
  });

  it('isProfileFormEmpty is true only when everything blank', () => {
    expect(isProfileFormEmpty(emptyProfileFormState())).toBe(true);
    expect(
      isProfileFormEmpty({ ...emptyProfileFormState(), city: 'x' }),
    ).toBe(false);
    expect(
      isProfileFormEmpty({
        ...emptyProfileFormState(),
        desiredPartnerGenders: ['MALE'],
      }),
    ).toBe(false);
  });
});
