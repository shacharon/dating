/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

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
import {
  APP_LOCALE_STORAGE_KEY,
} from '@/lib/i18n';
import { getSessionCookieName } from '@/lib/session-cookie';
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';

describe('PublicLandingClient i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach((part) => {
      const name = part.split('=')[0]?.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      signInWithGoogleIdToken: vi.fn(),
      lastError: null,
      clearLastError: vi.fn(),
      refresh: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach((part) => {
      const name = part.split('=')[0]?.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  });

  it('renders English landing copy by default', () => {
    render(<PublicLandingClient />);

    expect(screen.getByText(enCopy.landing.brand)).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: enCopy.landing.title }),
    ).toBeTruthy();
    expect(screen.getByText(enCopy.landing.subtitle)).toBeTruthy();
    expect(screen.getByText(enCopy.landing.googleSignIn)).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: enCopy.landing.how.title }),
    ).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: enCopy.landing.benefits.title }),
    ).toBeTruthy();

    const main = screen.getByRole('main');
    expect(main.getAttribute('dir')).toBe('ltr');
    expect(main.getAttribute('lang')).toBe('en');
  });

  it('renders SSR Hebrew initialLocale without waiting on storage', () => {
    render(<PublicLandingClient initialLocale="he" />);

    expect(
      screen.getByRole('heading', { name: heCopy.landing.title }),
    ).toBeTruthy();
    expect(screen.getByText(heCopy.landing.googleSignIn)).toBeTruthy();

    const heading = screen.getByRole('heading', { name: heCopy.landing.title });
    const main = heading.closest('main');
    expect(main?.getAttribute('dir')).toBe('rtl');
    expect(main?.getAttribute('lang')).toBe('he');
  });

  it('applies stored Hebrew after mount when SSR defaulted to English', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<PublicLandingClient initialLocale="en" />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: heCopy.landing.title }),
      ).toBeTruthy();
    });
    expect(screen.getByText(heCopy.landing.googleSignIn)).toBeTruthy();

    const heading = screen.getByRole('heading', { name: heCopy.landing.title });
    const main = heading.closest('main');
    expect(main?.getAttribute('dir')).toBe('rtl');
    expect(main?.getAttribute('lang')).toBe('he');
  });

  it('shows language picker when Google CTA is visible', () => {
    render(<PublicLandingClient />);

    expect(
      screen.getByLabelText(enCopy.languageSettings.label),
    ).toBeTruthy();
    expect(screen.getByRole('combobox').id).toBe('landing-language-picker');
  });

  it('updates landing copy and storage when picker changes to Hebrew', () => {
    render(<PublicLandingClient />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'he' },
    });

    expect(
      screen.getByRole('heading', { name: heCopy.landing.title }),
    ).toBeTruthy();
    expect(localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe('he');

    const main = screen.getByRole('main');
    expect(main.getAttribute('dir')).toBe('rtl');
    expect(main.getAttribute('lang')).toBe('he');
  });

  it('hides language picker during session bootstrap loading', () => {
    document.cookie = `${getSessionCookieName()}=session-token;path=/`;
    mockUseAuth.mockReturnValue({
      status: 'loading',
      signInWithGoogleIdToken: vi.fn(),
      lastError: null,
      clearLastError: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PublicLandingClient />);

    expect(screen.queryByRole('combobox')).toBeNull();
    expect(
      screen.getByText(
        (content) =>
          content === enCopy.landing.checkingSession ||
          content === heCopy.landing.checkingSession,
      ),
    ).toBeTruthy();
  });
});

describe('PublicLandingClient referral capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
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
