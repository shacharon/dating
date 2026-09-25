import { describe, expect, it } from 'vitest';
import {
  canNavigateOnboardingStep,
  isOnboardingStepFilled,
  onboardingStepHref,
  onboardingUiStepFromPathname,
} from './onboarding-step';

describe('onboardingUiStepFromPathname', () => {
  it('maps the three real routes', () => {
    expect(onboardingUiStepFromPathname('/onboarding/story')).toBe('story');
    expect(onboardingUiStepFromPathname('/onboarding/texts')).toBe('story');
    expect(onboardingUiStepFromPathname('/onboarding/basic')).toBe('facts');
    expect(onboardingUiStepFromPathname('/onboarding/basics')).toBe('facts');
    expect(onboardingUiStepFromPathname('/onboarding/preferences')).toBe(
      'preferences',
    );
    expect(onboardingUiStepFromPathname('/onboarding/photos')).toBe('photos');
    expect(onboardingUiStepFromPathname('/onboarding')).toBeNull();
  });

  it('does not map photos to facts', () => {
    expect(onboardingUiStepFromPathname('/onboarding/photos')).not.toBe('facts');
  });
});

describe('onboardingStepHref', () => {
  it('points each step at its route', () => {
    expect(onboardingStepHref('story', false)).toBe('/onboarding/story');
    expect(onboardingStepHref('story', true)).toBe('/onboarding/story?edit=1');
    expect(onboardingStepHref('facts', false)).toBe('/onboarding/basics');
    expect(onboardingStepHref('facts', true)).toBe('/onboarding/basics?edit=1');
    expect(onboardingStepHref('preferences', false)).toBe(
      '/onboarding/preferences',
    );
    expect(onboardingStepHref('preferences', true)).toBe(
      '/onboarding/preferences?edit=1',
    );
    expect(onboardingStepHref('photos', false)).toBe('/onboarding/photos');
    expect(onboardingStepHref('photos', true)).toBe('/onboarding/photos?edit=1');
  });
});

describe('isOnboardingStepFilled', () => {
  it('fills none when current is null', () => {
    expect(isOnboardingStepFilled('story', null)).toBe(false);
    expect(isOnboardingStepFilled('facts', null)).toBe(false);
  });

  it('fills only story on story step', () => {
    expect(isOnboardingStepFilled('story', 'story')).toBe(true);
    expect(isOnboardingStepFilled('facts', 'story')).toBe(false);
    expect(isOnboardingStepFilled('photos', 'story')).toBe(false);
  });

  it('fills prior steps on facts', () => {
    expect(isOnboardingStepFilled('story', 'facts')).toBe(true);
    expect(isOnboardingStepFilled('facts', 'facts')).toBe(true);
    expect(isOnboardingStepFilled('preferences', 'facts')).toBe(false);
    expect(isOnboardingStepFilled('photos', 'facts')).toBe(false);
  });

  it('fills story and facts on photos', () => {
    expect(isOnboardingStepFilled('story', 'photos')).toBe(true);
    expect(isOnboardingStepFilled('facts', 'photos')).toBe(true);
    expect(isOnboardingStepFilled('photos', 'photos')).toBe(true);
    expect(isOnboardingStepFilled('preferences', 'photos')).toBe(false);
  });

  it('fills all on preferences', () => {
    expect(isOnboardingStepFilled('story', 'preferences')).toBe(true);
    expect(isOnboardingStepFilled('facts', 'preferences')).toBe(true);
    expect(isOnboardingStepFilled('photos', 'preferences')).toBe(true);
    expect(isOnboardingStepFilled('preferences', 'preferences')).toBe(true);
  });
});

describe('canNavigateOnboardingStep', () => {
  it('allows free navigation among story/facts/preferences/photos', () => {
    expect(canNavigateOnboardingStep('facts', 'story')).toBe(true);
    expect(canNavigateOnboardingStep('preferences', 'story')).toBe(true);
    expect(canNavigateOnboardingStep('photos', 'story')).toBe(true);
    expect(canNavigateOnboardingStep('story', 'facts')).toBe(true);
    expect(canNavigateOnboardingStep('photos', 'facts')).toBe(true);
    expect(canNavigateOnboardingStep('preferences', 'photos')).toBe(true);
  });

  it('defaults to story when current is null', () => {
    expect(canNavigateOnboardingStep('story', null)).toBe(true);
    expect(canNavigateOnboardingStep('facts', null)).toBe(false);
  });
});
