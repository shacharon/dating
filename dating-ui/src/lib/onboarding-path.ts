import type { MeProfileDto } from '@/lib/me-profile-api';

/**
 * Where `/onboarding` should send the user based on `GET /api/v1/me/profile`.
 * `404` / `null` profile → start at basics.
 */
export function onboardingResumePath(profile: MeProfileDto | null): string {
  if (!profile) {
    return '/onboarding/basic';
  }
  switch (profile.onboardingStep) {
    case 'COMPLETED':
      return '/dating/profile';
    case 'TEXTS':
      return '/onboarding/texts';
    case 'BASIC':
    default:
      return '/onboarding/basic';
  }
}
