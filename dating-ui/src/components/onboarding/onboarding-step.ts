export type OnboardingUiStep = 'basic' | 'texts';

export function onboardingUiStepFromPathname(
  pathname: string,
): OnboardingUiStep | null {
  if (pathname.startsWith('/onboarding/texts')) return 'texts';
  if (pathname.startsWith('/onboarding/basic')) return 'basic';
  return null;
}

/** Visual fill: current and prior steps are filled. */
export function isOnboardingStepFilled(
  step: OnboardingUiStep,
  current: OnboardingUiStep | null,
): boolean {
  if (!current) return false;
  if (step === 'basic') return true;
  return current === 'texts';
}

/**
 * Only allow stepping back to Basic from Texts (not forward via stepper).
 */
export function canNavigateOnboardingStep(
  target: OnboardingUiStep,
  current: OnboardingUiStep | null,
): boolean {
  return target === 'basic' && current === 'texts';
}
