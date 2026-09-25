/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

const { mockPostReferralLandingView, mockUseAuth } = vi.hoisted(() => ({
  mockPostReferralLandingView: vi.fn(),
  mockUseAuth: vi.fn(),
}));

vi.mock('@/lib/api/referral-attribution-api', () => ({
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
import { REFERRAL_STORAGE_KEY } from '@/lib/referral/referral-attribution';
import {
  APP_LOCALE_STORAGE_KEY,
} from '@/lib/i18n';
import { getSessionCookieName } from '@/lib/auth/session-cookie';
import { enCopy } from '@/lib/i18n/en';
import { esCopy } from '@/lib/i18n/es';
import { heCopy } from '@/lib/i18n/he';

function expectPlainAnalysisHint(text: string) {
  const hint = screen.getByText(text);
  expect(hint.tagName).toBe('P');
  expect(hint.querySelector('a, button')).toBeNull();
  expect(hint.closest('a, button')).toBeNull();
}

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
    expectPlainAnalysisHint(enCopy.landing.analysisHint);
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

  it('renders stored Hebrew landing copy with RTL main', () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<PublicLandingClient />);

    expect(
      screen.getByRole('heading', { name: heCopy.landing.title }),
    ).toBeTruthy();
    expect(screen.getByText(heCopy.landing.googleSignIn)).toBeTruthy();
    expectPlainAnalysisHint(heCopy.landing.analysisHint);

    const heading = screen.getByRole('heading', { name: heCopy.landing.title });
    const main = heading.closest('main');
    expect(main?.getAttribute('dir')).toBe('rtl');
    expect(main?.getAttribute('lang')).toBe('he');
  });

  it('renders stored Spanish analysis hint on the logged-out landing', () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'es');

    render(<PublicLandingClient />);

    expectPlainAnalysisHint(esCopy.landing.analysisHint);
    expect(screen.getByText(esCopy.landing.googleSignIn)).toBeTruthy();
  });

  it('shows language flags when Google CTA is visible', () => {
    render(<PublicLandingClient />);

    expect(
      screen.getByRole('group', { name: enCopy.languageSettings.label }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: enCopy.languageSettings.optionHe }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: enCopy.languageSettings.optionEn }),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: enCopy.languageSettings.optionEs }),
    ).toBeTruthy();
  });

  it('updates landing copy and storage when the Hebrew flag is clicked', () => {
    render(<PublicLandingClient />);

    fireEvent.click(
      screen.getByRole('button', { name: enCopy.languageSettings.optionHe }),
    );

    expect(
      screen.getByRole('heading', { name: heCopy.landing.title }),
    ).toBeTruthy();
    expect(localStorage.getItem(APP_LOCALE_STORAGE_KEY)).toBe('he');
    expectPlainAnalysisHint(heCopy.landing.analysisHint);

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

    expect(
      screen.queryByRole('group', { name: enCopy.languageSettings.label }),
    ).toBeNull();
    expect(screen.queryByText(enCopy.landing.analysisHint)).toBeNull();
    expect(
      screen.getByText(
        (content) =>
          content === enCopy.landing.checkingSession ||
          content === heCopy.landing.checkingSession,
      ),
    ).toBeTruthy();
  });

  it('hides the analysis hint after sign-in', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      signInWithGoogleIdToken: vi.fn(),
      lastError: null,
      clearLastError: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PublicLandingClient />);

    expect(screen.queryByText(enCopy.landing.analysisHint)).toBeNull();
  });

  it('keeps the analysis hint while the Google control is visible after an auth error', () => {
    mockUseAuth.mockReturnValue({
      status: 'error',
      signInWithGoogleIdToken: vi.fn(),
      lastError: 'Could not reach the API',
      clearLastError: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PublicLandingClient />);

    expectPlainAnalysisHint(enCopy.landing.analysisHint);
    expect(screen.getByText(enCopy.landing.googleSignIn)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('hides the analysis hint while auth is loading and no session cookie is set', () => {
    mockUseAuth.mockReturnValue({
      status: 'loading',
      signInWithGoogleIdToken: vi.fn(),
      lastError: null,
      clearLastError: vi.fn(),
      refresh: vi.fn(),
    });

    render(<PublicLandingClient />);

    expect(screen.queryByText(enCopy.landing.analysisHint)).toBeNull();
    expect(screen.queryByText(enCopy.landing.googleSignIn)).toBeNull();
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
