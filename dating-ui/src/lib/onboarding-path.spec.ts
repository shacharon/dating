import { describe, expect, it } from 'vitest';
import type { MeProfileDto } from '@/lib/me-profile-api';
import { onboardingResumePath } from '@/lib/onboarding-path';

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
  it('sends null profile to basics', () => {
    expect(onboardingResumePath(null)).toBe('/onboarding/basic');
  });

  it('maps onboarding steps', () => {
    expect(onboardingResumePath(row('BASIC'))).toBe('/onboarding/basic');
    expect(onboardingResumePath(row('TEXTS'))).toBe('/onboarding/texts');
    expect(onboardingResumePath(row('COMPLETED'))).toBe('/dating/profile');
  });
});
