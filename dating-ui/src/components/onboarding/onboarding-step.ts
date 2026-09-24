export type OnboardingUiStep = 'story' | 'facts' | 'photos';

const STEP_ORDER: OnboardingUiStep[] = ['story', 'facts', 'photos'];

/**
 * Map an onboarding pathname to the three-route stepper step.
 * Legacy `/onboarding/texts` highlights Story; `/onboarding/basic` highlights Facts.
 */
export function onboardingUiStepFromPathname(pathname: string): OnboardingUiStep | null {
  if (
    pathname.startsWith('/onboarding/story') ||
    pathname.startsWith('/onboarding/texts')
  ) {
    return 'story';
  }
  if (
    pathname.startsWith('/onboarding/basics') ||
    pathname === '/onboarding/basic' ||
    pathname.startsWith('/onboarding/basic/')
  ) {
    return 'facts';
  }
  if (pathname.startsWith('/onboarding/photos')) {
    return 'photos';
  }
  return null;
}

/** Visual fill: current and prior steps are filled. */
export function isOnboardingStepFilled(
  step: OnboardingUiStep,
  current: OnboardingUiStep | null,
): boolean {
  if (!current) return false;
  const currentIdx = STEP_ORDER.indexOf(current);
  const stepIdx = STEP_ORDER.indexOf(step);
  if (currentIdx < 0 || stepIdx < 0) return false;
  return stepIdx <= currentIdx;
}

/** Free navigation among Story / Facts / Photos during onboarding. */
export function canNavigateOnboardingStep(
  target: OnboardingUiStep,
  current: OnboardingUiStep | null,
): boolean {
  if (!STEP_ORDER.includes(target)) return false;
  if (!current) return target === 'story';
  return STEP_ORDER.includes(current);
}

export function onboardingStepHref(
  step: OnboardingUiStep,
  editMode: boolean,
): string {
  const base =
    step === 'story'
      ? '/onboarding/story'
      : step === 'facts'
        ? '/onboarding/basics'
        : '/onboarding/photos';
  return editMode ? `${base}?edit=1` : base;
}
