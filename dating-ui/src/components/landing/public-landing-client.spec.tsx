/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const { mockPostReferralLandingView, mockUseAuth } = vi.hoisted(() => ({
  mockPostReferralLandingView: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('@/lib/referral-attribution-api', () => ({
  postReferralLandingView: mockPostReferralLandingView,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('ref=c123456789012345678901234'),
}));

vi.mock('@/components/auth/google-sign-in-button', () => ({
  GoogleSignInButton: () => null,
}));

vi.mock('next/link', () => ({
  default ({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  },
}));

import { PublicLandingClient } from './public-landing-client';
import { REFERRAL_STORAGE_KEY } from '@/lib/referral-attribution';

describe('PublicLandingClient referral capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      signInWithGoogleIdToken: vi.fn(),
      lastError: null,
      clearLastError: vi.fn(),
      refresh: vi.fn(),
    });
  });

  it('stores ref from URL and fires landing beacon', async () => {
    render(<PublicLandingClient />);
    await waitFor(() => {
      expect(sessionStorage.getItem(REFERRAL_STORAGE_KEY)).toBe(
        'c123456789012345678901234',
      );
      expect(mockPostReferralLandingView).toHaveBeenCalledWith(true);
    });
  });
});
