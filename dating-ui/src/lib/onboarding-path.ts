import type { MeProfileDto } from '@/lib/me-profile-api';

export type OnboardingResumeOptions = {
  /** When true with `page`, allow opening that step even if `onboardingStep` is `COMPLETED`. */
  edit?: boolean;
  /** Which onboarding route is being guarded (`?edit=1` deep-links from the avatar menu). */
  page?: 'basic' | 'texts';
};

/**
 * Where `/onboarding` should send the user based on `GET /api/v1/me/profile`.
 * `404` / `null` profile → start at basics.
 *
 * With `{ edit: true, page }`, completed users may re-open that step without being sent to `/dating/profile`.
 * Story (`texts`) deep-links from the nav always open the story step when a profile row exists; only missing
 * profile sends the user to basics. Finish/submit still validates required basics (e.g. gender) on the texts step.
 */
export function onboardingResumePath(
  profile: MeProfileDto | null,
  options?: OnboardingResumeOptions,
): string {
  const edit = options?.edit === true;
  const page = options?.page;

  if (edit && page === 'basic') {
    return '/onboarding/basic';
  }

  if (edit && page === 'texts') {
    if (!profile) {
      return '/onboarding/basic';
    }
    return '/onboarding/texts';
  }

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
