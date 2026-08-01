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
    expect(onboardingResumePath(row('COMPLETED'))).toBe('/profile');
  });

  it('edit=basic allows COMPLETED users to stay on basics', () => {
    expect(
      onboardingResumePath(row('COMPLETED'), { edit: true, page: 'basic' }),
    ).toBe('/onboarding/basic');
  });

  it('edit=texts sends COMPLETED users to story step', () => {
    expect(
      onboardingResumePath(row('COMPLETED'), { edit: true, page: 'texts' }),
    ).toBe('/onboarding/texts');
  });

  it('edit=texts opens story when a profile exists; only null profile goes to basics', () => {
    expect(
      onboardingResumePath(row('BASIC'), { edit: true, page: 'texts' }),
    ).toBe('/onboarding/texts');
    expect(onboardingResumePath(null, { edit: true, page: 'texts' })).toBe(
      '/onboarding/basic',
    );
  });
});
