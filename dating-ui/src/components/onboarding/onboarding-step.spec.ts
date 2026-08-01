import { describe, expect, it } from 'vitest';
import {
  canNavigateOnboardingStep,
  isOnboardingStepFilled,
  onboardingUiStepFromPathname,
} from './onboarding-step';

describe('onboardingUiStepFromPathname', () => {
  it('maps basic and texts paths', () => {
    expect(onboardingUiStepFromPathname('/onboarding/basic')).toBe('basic');
    expect(onboardingUiStepFromPathname('/onboarding/texts')).toBe('texts');
    expect(onboardingUiStepFromPathname('/onboarding')).toBeNull();
  });
});

describe('isOnboardingStepFilled', () => {
  it('fills none when current is null', () => {
    expect(isOnboardingStepFilled('basic', null)).toBe(false);
    expect(isOnboardingStepFilled('texts', null)).toBe(false);
  });

  it('fills only basic on basic step', () => {
    expect(isOnboardingStepFilled('basic', 'basic')).toBe(true);
    expect(isOnboardingStepFilled('texts', 'basic')).toBe(false);
  });

  it('fills both on texts step', () => {
    expect(isOnboardingStepFilled('basic', 'texts')).toBe(true);
    expect(isOnboardingStepFilled('texts', 'texts')).toBe(true);
  });
});

describe('canNavigateOnboardingStep', () => {
  it('allows back to basic from texts only', () => {
    expect(canNavigateOnboardingStep('basic', 'texts')).toBe(true);
    expect(canNavigateOnboardingStep('texts', 'basic')).toBe(false);
    expect(canNavigateOnboardingStep('basic', 'basic')).toBe(false);
    expect(canNavigateOnboardingStep('basic', null)).toBe(false);
  });
});
