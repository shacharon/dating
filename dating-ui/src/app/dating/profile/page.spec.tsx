/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import type { ReactNode } from 'react';

const { resolveEditableProfile, listMyProfilePhotos, patchNotificationPreferences } =
  vi.hoisted(() => ({
    resolveEditableProfile: vi.fn(),
    listMyProfilePhotos: vi.fn(),
    patchNotificationPreferences: vi.fn(),
  }));

vi.mock('@/lib/profile-form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/profile-form')>();
  return {
    ...actual,
    resolveEditableProfile,
  };
});

vi.mock('@/lib/me-photos-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/me-photos-api')>();
  return {
    ...actual,
    listMyProfilePhotos,
  };
});

vi.mock('@/lib/notification-preferences-api', () => ({
  patchNotificationPreferences,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'user_me',
      email: 'a@test.com',
      displayName: 'A',
      avatarUrl: null,
      status: 'ACTIVE',
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    },
    refresh: vi.fn(),
    status: 'authenticated',
    signInWithGoogleIdToken: vi.fn(),
    logout: vi.fn(),
    lastError: null,
    clearLastError: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => createElement('a', { href, ...props }, children),
}));

import ProfilePage from '@/app/dating/profile/profile-page-client';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';
import type { MeProfileDto } from '@/lib/me-profile-api';

const mockProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'COMPLETED',
  nickname: 'Alex',
  aboutMe: 'Hello',
  aboutPartner: 'Kind',
  aboutRelationship: 'Long term',
  birthDate: '1990-01-01',
  gender: 'MALE',
  desiredPartnerGenders: ['FEMALE'],
  city: 'Tel Aviv',
  country: 'IL',
  locationLabel: 'Tel Aviv, Israel',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('ProfilePage i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
    resolveEditableProfile.mockResolvedValue(mockProfile);
    listMyProfilePhotos.mockResolvedValue([]);
    patchNotificationPreferences.mockResolvedValue({
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  it('renders English review chrome after profile loads', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: enCopy.profile.viewPage.titleReview,
        }),
      ).toBeTruthy();
      expect(screen.getByText(enCopy.profile.viewPage.subtitle)).toBeTruthy();
      expect(
        screen.getByText(enCopy.onboarding.basicForm.nicknameLabel),
      ).toBeTruthy();
      const prefsLink = screen.getByTestId('profile-match-preferences-link');
      expect(prefsLink.textContent).toContain(
        enCopy.profile.matchPreferencesLink,
      );
    });
  });

  it('renders Hebrew title and find-matches link when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<ProfilePage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: heCopy.profile.viewPage.titleReview,
        }),
      ).toBeTruthy();
      expect(
        screen.getByRole('link', { name: heCopy.profile.viewPage.findMatchesLink }),
      ).toBeTruthy();
    });
  });
});
