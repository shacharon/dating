/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    status: 'unauthenticated',
    signInWithGoogleIdToken: vi.fn(),
    lastError: null,
    clearLastError: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/auth/google-sign-in-button', () => ({
  GoogleSignInButton: () => <div data-testid="google-sign-in" />,
}));

import { PublicLandingClient } from '@/components/landing/public-landing-client';

describe('PublicLandingClient', () => {
  it('renders privacy and terms footer links', () => {
    render(<PublicLandingClient />);
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe(
      '/privacy',
    );
    expect(screen.getByRole('link', { name: 'Terms' }).getAttribute('href')).toBe(
      '/terms',
    );
  });
});
