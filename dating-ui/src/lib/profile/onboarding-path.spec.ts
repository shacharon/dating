import { describe, expect, it } from 'vitest';
import type { MeProfileDto } from '@/lib/api/me-profile-api';
import { onboardingResumePath } from '@/lib/profile/onboarding-path';

function row(step: MeProfileDto['onboardingStep']): MeProfileDto {
  return {
    id: 'p',
    userId: 'u',
    status: 'DRAFT',
    onboardingStep: step,
    aboutMe: null,
    aboutPartner: null,
    aboutRelationship: null,
    createdAt: 't',
    updatedAt: 't',
  };
}

describe('onboardingResumePath', () => {
  it('sends null profile to story (screen 1)', () => {
    expect(onboardingResumePath(null)).toBe('/onboarding/story');
  });

  it('maps onboarding steps', () => {
    expect(onboardingResumePath(row('BASIC'))).toBe('/onboarding/story');
    expect(onboardingResumePath(row('TEXTS'))).toBe('/onboarding/basic');
    expect(onboardingResumePath(row('COMPLETED'))).toBe('/profile');
  });

  it('BASIC with gender resumes to facts (after story continue)', () => {
    expect(
      onboardingResumePath({ ...row('BASIC'), gender: 'MALE' }),
    ).toBe('/onboarding/basic');
  });

  it('edit=basic allows COMPLETED users to stay on basics', () => {
    expect(
      onboardingResumePath(row('COMPLETED'), { edit: true, page: 'basic' }),
    ).toBe('/onboarding/basic');
  });

  it('edit=texts sends users with a profile to /onboarding/story', () => {
    expect(
      onboardingResumePath(row('COMPLETED'), { edit: true, page: 'texts' }),
    ).toBe('/onboarding/story');
    expect(
      onboardingResumePath(row('BASIC'), { edit: true, page: 'texts' }),
    ).toBe('/onboarding/story');
    expect(onboardingResumePath(null, { edit: true, page: 'texts' })).toBe(
      '/onboarding/basic',
    );
  });
});
