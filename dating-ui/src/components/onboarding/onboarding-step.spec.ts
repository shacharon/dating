import { describe, expect, it } from 'vitest';
import {
  canNavigateOnboardingStep,
  isOnboardingStepFilled,
  onboardingTabFromSearchParams,
  onboardingTabHref,
  onboardingUiStepFromPathname,
} from './onboarding-step';

describe('onboardingUiStepFromPathname', () => {
  it('maps story and basic paths', () => {
    expect(onboardingUiStepFromPathname('/onboarding/story')).toBe('story');
    expect(onboardingUiStepFromPathname('/onboarding/texts')).toBe('story');
    expect(onboardingUiStepFromPathname('/onboarding/basic')).toBe('basic');
    expect(onboardingUiStepFromPathname('/onboarding')).toBeNull();
  });

  it('maps tab query on basic path', () => {
    expect(
      onboardingUiStepFromPathname('/onboarding/basic', new URLSearchParams('tab=basic')),
    ).toBe('basic');
    expect(
      onboardingUiStepFromPathname('/onboarding/basic', new URLSearchParams('tab=other')),
    ).toBe('other');
  });
});

describe('onboardingTabFromSearchParams', () => {
  it('defaults to basic (story is its own route)', () => {
    expect(onboardingTabFromSearchParams(new URLSearchParams())).toBe('basic');
  });
});

describe('onboardingTabHref', () => {
  it('points story tab at /onboarding/story', () => {
    expect(onboardingTabHref('story', false)).toBe('/onboarding/story');
    expect(onboardingTabHref('story', true)).toBe('/onboarding/story?edit=1');
  });
});

describe('isOnboardingStepFilled', () => {
  it('fills none when current is null', () => {
    expect(isOnboardingStepFilled('story', null)).toBe(false);
    expect(isOnboardingStepFilled('basic', null)).toBe(false);
  });

  it('fills only story on story step', () => {
    expect(isOnboardingStepFilled('story', 'story')).toBe(true);
    expect(isOnboardingStepFilled('basic', 'story')).toBe(false);
  });

  it('fills prior steps on basic', () => {
    expect(isOnboardingStepFilled('story', 'basic')).toBe(true);
    expect(isOnboardingStepFilled('basic', 'basic')).toBe(true);
    expect(isOnboardingStepFilled('other', 'basic')).toBe(false);
  });
});

describe('canNavigateOnboardingStep', () => {
  it('allows free navigation among story/basic/other', () => {
    expect(canNavigateOnboardingStep('basic', 'story')).toBe(true);
    expect(canNavigateOnboardingStep('other', 'story')).toBe(true);
    expect(canNavigateOnboardingStep('story', 'basic')).toBe(true);
    expect(canNavigateOnboardingStep('texts', 'story')).toBe(false);
  });

  it('allows back to story/basic/other from texts page', () => {
    expect(canNavigateOnboardingStep('story', 'texts')).toBe(true);
    expect(canNavigateOnboardingStep('basic', 'texts')).toBe(true);
    expect(canNavigateOnboardingStep('other', 'texts')).toBe(true);
  });
});
