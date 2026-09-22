export type OnboardingUiStep = 'basic' | 'story' | 'other' | 'texts';

export type OnboardingTab = 'basic' | 'story' | 'other';

export function onboardingTabFromSearchParams(
  searchParams: { get: (key: string) => string | null },
): OnboardingTab {
  const tab = searchParams.get('tab');
  if (tab === 'basic' || tab === 'other') return tab;
  return 'story';
}

export function onboardingUiStepFromPathname(
  pathname: string,
  searchParams?: { get: (key: string) => string | null },
): OnboardingUiStep | null {
  if (pathname.startsWith('/onboarding/texts')) return 'texts';
  if (pathname.startsWith('/onboarding/basic')) {
    if (!searchParams) return 'story';
    return onboardingTabFromSearchParams(searchParams);
  }
  return null;
}

/** Visual fill: current and prior steps are filled. */
export function isOnboardingStepFilled(
  step: OnboardingUiStep,
  current: OnboardingUiStep | null,
): boolean {
  if (!current) return false;
  const order: OnboardingUiStep[] = ['story', 'basic', 'other', 'texts'];
  const currentIdx = order.indexOf(current);
  const stepIdx = order.indexOf(step);
  if (currentIdx < 0 || stepIdx < 0) return false;
  return stepIdx <= currentIdx;
}

/**
 * Allow free navigation among Basic / Story / Other on the basic page.
 * Texts page can still step back to Basic.
 */
export function canNavigateOnboardingStep(
  target: OnboardingUiStep,
  current: OnboardingUiStep | null,
): boolean {
  if (target === 'texts') return false;
  if (!current) return target === 'story';
  if (current === 'texts') {
    return target === 'basic' || target === 'story' || target === 'other';
  }
  return target === 'basic' || target === 'story' || target === 'other';
}

export function onboardingTabHref(tab: OnboardingTab, editMode: boolean): string {
  const base = `/onboarding/basic?tab=${tab}`;
  if (!editMode) return base;
  return `${base}&edit=1`;
}
