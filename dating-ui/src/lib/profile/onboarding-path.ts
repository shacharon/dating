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
 * Sprint 75: Story → Facts → Photos.
 * BASIC (no gender) → story; BASIC (gender set) → basics; TEXTS → photos; COMPLETED → profile.
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

const MATCHES_PATH = '/dating/me-matches';

/** A run has been started at least once (including a finished or failed one). */
export function analysisHasStarted(status: string | undefined): boolean {
  return (
    status === 'SUBMITTED' ||
    status === 'ANALYZING' ||
    status === 'ANALYZED' ||
    status === 'FAILED'
  );
}

/**
 * Login destination. Onboarding until the first analysis run, then Matches.
 * An explicit `next` path is used only after analysis has started.
 */
export function postLoginPath(
  profile: MeProfileDto | null,
  requestedNext?: string | null,
): string {
  if (!analysisHasStarted(profile?.status)) {
    const resume = onboardingResumePath(profile);
    return resume === '/profile' ? '/onboarding/preferences' : resume;
  }
  const next = requestedNext?.trim();
  if (next?.startsWith('/') && !next.startsWith('//')) return next;
  return MATCHES_PATH;
}
