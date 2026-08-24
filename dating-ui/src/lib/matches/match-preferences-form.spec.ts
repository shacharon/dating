import { describe, expect, it } from 'vitest';
import {
  emptyMatchPreferencesFormState,
  matchPreferencesFormToPatchBody,
  profileToMatchPreferencesForm,
  toggleArrayValue,
  validateMatchPreferencesForm,
} from '@/lib/matches/match-preferences-form';
import type { MeProfileDto } from '@/lib/api/me-profile-api';

const baseProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'COMPLETED',
  aboutMe: 'Hello',
  aboutPartner: 'Kind',
  aboutRelationship: 'Long term',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  desiredPartnerGenders: ['FEMALE', 'NON_BINARY'],
  partnerAgeMin: 28,
  partnerAgeMax: 40,
  maxDistanceKm: 50,
};

describe('match-preferences-form', () => {
  it('profileToMatchPreferencesForm maps API profile to form state', () => {
    expect(profileToMatchPreferencesForm(baseProfile)).toEqual({
      desiredPartnerGenders: ['FEMALE', 'NON_BINARY'],
      partnerAgeMin: '28',
      partnerAgeMax: '40',
      maxDistanceKm: '50',
    });
  });

  it('validateMatchPreferencesForm requires at least one partner gender', () => {
    expect(
      validateMatchPreferencesForm({
        ...emptyMatchPreferencesFormState(),
        desiredPartnerGenders: [],
      }),
    ).toEqual({ ok: false, error: 'partnerGendersRequired' });
  });

  it('validateMatchPreferencesForm rejects min greater than max', () => {
    expect(
      validateMatchPreferencesForm({
        ...emptyMatchPreferencesFormState(),
        desiredPartnerGenders: ['MALE'],
        partnerAgeMin: '40',
        partnerAgeMax: '30',
      }),
    ).toEqual({ ok: false, error: 'ageRangeInvalid' });
  });

  it('validateMatchPreferencesForm accepts partial age range', () => {
    expect(
      validateMatchPreferencesForm({
        ...emptyMatchPreferencesFormState(),
        desiredPartnerGenders: ['MALE'],
        partnerAgeMin: '25',
        partnerAgeMax: '',
      }),
    ).toEqual({ ok: true });
  });

  it('matchPreferencesFormToPatchBody maps scalars', () => {
    const state = profileToMatchPreferencesForm(baseProfile);
    expect(matchPreferencesFormToPatchBody(state)).toEqual({
      desiredPartnerGenders: ['FEMALE', 'NON_BINARY'],
      partnerAgeMin: 28,
      partnerAgeMax: 40,
      maxDistanceKm: 50,
    });
  });

  it('matchPreferencesFormToPatchBody clears nullable fields with null', () => {
    expect(
      matchPreferencesFormToPatchBody({
        ...emptyMatchPreferencesFormState(),
        desiredPartnerGenders: ['FEMALE'],
      }),
    ).toEqual({
      desiredPartnerGenders: ['FEMALE'],
      partnerAgeMin: null,
      partnerAgeMax: null,
      maxDistanceKm: null,
    });
  });

  it('toggleArrayValue adds and removes values', () => {
    expect(toggleArrayValue(['A'], 'B')).toEqual(['A', 'B']);
    expect(toggleArrayValue(['A', 'B'], 'A')).toEqual(['B']);
  });
});
