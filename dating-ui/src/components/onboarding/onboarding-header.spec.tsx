/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const mockPush = vi.fn();
const mockPathname = vi.fn(() => '/onboarding/basics');
const mockSearchParams = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
  useSearchParams: () => mockSearchParams(),
}));

vi.mock('next/link', () => ({
  default({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

import { OnboardingHeader } from './onboarding-header';
import { enCopy } from '@/lib/i18n/en';

describe('OnboardingHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/onboarding/basics');
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    cleanup();
  });

  it('has no Exit or Skip button', () => {
    render(<OnboardingHeader />);
    expect(screen.queryByTestId('onboarding-exit')).toBeNull();
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
  });

  it('shows Story, Facts, Preferences, and Photos steps', () => {
    render(<OnboardingHeader />);
    expect(screen.getByText(enCopy.onboarding.tabs.story)).toBeTruthy();
    expect(screen.getByText(enCopy.onboarding.tabs.facts)).toBeTruthy();
    expect(screen.getByText(enCopy.onboarding.tabs.preferences)).toBeTruthy();
    expect(screen.getByText(enCopy.onboarding.tabs.photos)).toBeTruthy();
  });

  it('highlights Photos on the photos route', () => {
    mockPathname.mockReturnValue('/onboarding/photos');
    render(<OnboardingHeader />);
    const photosLink = screen.getByRole('link', {
      name: new RegExp(enCopy.onboarding.tabs.photos, 'i'),
    });
    expect(photosLink.getAttribute('aria-current')).toBe('step');
    expect(photosLink.getAttribute('href')).toBe('/onboarding/photos');
  });

});
