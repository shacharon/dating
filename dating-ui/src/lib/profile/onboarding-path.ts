import type { MeProfileDto } from '@/lib/api/me-profile-api';

export type OnboardingResumeOptions = {
  /** When true with `page`, allow opening that step even if `onboardingStep` is `COMPLETED`. */
  edit?: boolean;
  /** Which onboarding route is being guarded (`?edit=1` deep-links from the avatar menu). */
  page?: 'basic' | 'texts';
};

/**
 * Where `/onboarding` should send the user based on `GET /api/v1/me/profile`.
 * `404` / `null` profile → start at story (screen 1).
 *
 * Sprint 75 Story 3: facts live at `/onboarding/basics`; TEXTS → photos stub.
 */
export function onboardingResumePath(
  profile: MeProfileDto | null,
  options?: OnboardingResumeOptions,
): string {
  const edit = options?.edit === true;
  const page = options?.page;

  if (edit && page === 'basic') {
    return '/onboarding/basics?edit=1';
  }

  if (edit && page === 'texts') {
    if (!profile) {
      return '/onboarding/basics';
    }
    return '/onboarding/story';
  }

  if (!profile) {
    return '/onboarding/story';
  }
  switch (profile.onboardingStep) {
    case 'COMPLETED':
      return '/profile';
    case 'TEXTS':
      return '/onboarding/photos';
    case 'BASIC':
    default: {
      const gender = profile.gender;
      if (gender && gender !== 'PREFER_NOT_TO_SAY') {
        return '/onboarding/basics';
      }
      return '/onboarding/story';
    }
  }
}
