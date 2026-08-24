import { describe, expect, it } from 'vitest';
import {
  buildCreatePayload,
  buildPatchPayload,
  profileToFormFields,
} from '@/lib/profile/profile-form';
import type { MeProfileDto } from '@/lib/api/me-profile-api';

/**
 * Phase 2.5 — UI persistence contract: GET-shaped API → form state → PATCH/POST payload.
 * Complements component-less coverage (no RTL in this package).
 */

function enrichedApiProfile(): MeProfileDto {
  return {
    id: 'p_enr',
    userId: 'u1',
    status: 'DRAFT',
    onboardingStep: 'TEXTS',
    nickname: null,
    aboutMe: 'Runner',
    aboutPartner: 'Kind',
    aboutRelationship: null,
    birthDate: '1991-04-12T00:00:00.000Z',
    gender: 'FEMALE',
    desiredPartnerGenders: ['MALE', 'NON_BINARY'],
    city: 'Haifa',
    country: 'IL',
    locationLabel: 'Haifa, IL',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

describe('Phase 2.5 profile enrichment (UI persistence helpers)', () => {
  it('profileToFormFields maps GET response into onboarding form state', () => {
    const form = profileToFormFields(enrichedApiProfile());
    expect(form.nickname).toBe('');
    expect(form.birthDate).toBe('1991-04-12');
    expect(form.gender).toBe('FEMALE');
    expect(form.desiredPartnerGenders).toEqual(['MALE', 'NON_BINARY']);
    expect(form.city).toBe('Haifa');
    expect(form.country).toBe('IL');
    expect(form.locationLabel).toBe('Haifa, IL');
    expect(form.aboutMe).toBe('Runner');
    expect(form.aboutPartner).toBe('Kind');
    expect(form.aboutRelationship).toBe('');
  });

  it('buildPatchPayload round-trips enriched form for save draft', () => {
    const form = profileToFormFields(enrichedApiProfile());
    const payload = buildPatchPayload(form);
    expect(payload).toEqual({
      nickname: null,
      aboutMe: 'Runner',
      aboutPartner: 'Kind',
      aboutRelationship: null,
      birthDate: '1991-04-12',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE', 'NON_BINARY'],
      city: 'Haifa',
      country: 'IL',
      locationLabel: 'Haifa, IL',
    });
  });

  it('buildCreatePayload matches buildPatchPayload for same form (draft body shape)', () => {
    const form = profileToFormFields(enrichedApiProfile());
    expect(buildCreatePayload(form)).toEqual(buildPatchPayload(form));
  });
});
