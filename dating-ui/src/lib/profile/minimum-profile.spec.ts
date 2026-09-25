import { describe, expect, it } from 'vitest';
import type { MeProfileDto } from '@/lib/api-types/profile';
import { hasMinimumProfileFacts } from './minimum-profile';

function profile(partial: Partial<MeProfileDto>): MeProfileDto {
  return {
    id: 'p',
    userId: 'u',
    status: 'DRAFT',
    onboardingStep: 'BASIC',
    aboutMe: null,
    aboutPartner: null,
    aboutRelationship: null,
    createdAt: '',
    updatedAt: '',
    ...partial,
  };
}

describe('hasMinimumProfileFacts', () => {
  it('is false with no profile', () => {
    expect(hasMinimumProfileFacts(null)).toBe(false);
  });

  it('is true when gender, partner, location, and birth date are set', () => {
    expect(
      hasMinimumProfileFacts(
        profile({
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          city: 'Tel Aviv',
          birthDate: '1990-01-01',
        }),
      ),
    ).toBe(true);
  });

  it('is false when location is missing', () => {
    expect(
      hasMinimumProfileFacts(
        profile({
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          birthDate: '1990-01-01',
        }),
      ),
    ).toBe(false);
  });
});
