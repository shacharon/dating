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

describe('OnboardingHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname.mockReturnValue('/onboarding/basic');
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    cleanup();
  });

  it('opens exit dialog and confirms leave to matches', () => {
    render(<OnboardingHeader />);
    fireEvent.click(screen.getByTestId('onboarding-exit'));
    expect(screen.getByTestId('onboarding-exit-dialog')).toBeTruthy();
    fireEvent.click(screen.getByTestId('onboarding-exit-confirm'));
    expect(mockPush).toHaveBeenCalledWith('/dating/me-matches');
  });

  it('skips immediately to matches', () => {
    render(<OnboardingHeader />);
    fireEvent.click(screen.getByTestId('onboarding-skip'));
    expect(mockPush).toHaveBeenCalledWith('/dating/me-matches');
    expect(screen.queryByTestId('onboarding-exit-dialog')).toBeNull();
  });

  it('hides skip in edit mode and exits to profile', () => {
    mockSearchParams.mockReturnValue(new URLSearchParams('edit=1'));
    render(<OnboardingHeader />);
    expect(screen.queryByTestId('onboarding-skip')).toBeNull();
    fireEvent.click(screen.getByTestId('onboarding-exit'));
    fireEvent.click(screen.getByTestId('onboarding-exit-confirm'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });
});
