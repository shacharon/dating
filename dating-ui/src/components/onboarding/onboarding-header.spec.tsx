/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const mockPush = vi.fn();
const mockPathname = vi.fn(() => '/onboarding/basic');
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
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

import { OnboardingHeader } from './onboarding-header';
import { enCopy } from '@/lib/i18n/en';

describe('OnboardingHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/onboarding/basic');
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    cleanup();
  });

  it('has no Exit button — Skip only', () => {
    render(<OnboardingHeader />);
    expect(screen.queryByTestId('onboarding-exit')).toBeNull();
    expect(screen.getByTestId('onboarding-skip')).toBeTruthy();
  });

  it('shows Basic, Story, and Other steps', () => {
    render(<OnboardingHeader />);
    expect(screen.getByText(enCopy.onboarding.tabs.basic)).toBeTruthy();
    expect(screen.getByText(enCopy.onboarding.tabs.story)).toBeTruthy();
    expect(screen.getByText(enCopy.onboarding.tabs.other)).toBeTruthy();
  });

  it('skips immediately to matches', () => {
    render(<OnboardingHeader />);
    fireEvent.click(screen.getByTestId('onboarding-skip'));
    expect(mockPush).toHaveBeenCalledWith('/dating/me-matches');
  });

  it('hides skip in edit mode', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('edit=1'));
    render(<OnboardingHeader />);
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
  });
});
