/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const {
  fetchMyProfile,
  listMyProfilePhotos,
  fetchMyProfilePhotoBlob,
  fetchProfileQuality,
  fetchMyLatestAnalysis,
} = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  listMyProfilePhotos: vi.fn(),
  fetchMyProfilePhotoBlob: vi.fn(),
  fetchProfileQuality: vi.fn(),
  fetchMyLatestAnalysis: vi.fn(),
}));

const replaceMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    profile: {
      fetchMyProfile,
      patchMyProfile: vi.fn(),
      createMyProfile: vi.fn(),
      submitMyProfileForAnalysis: vi.fn(),
    },
  },
}));

vi.mock('@/lib/api/me-photos-api', () => ({
  listMyProfilePhotos,
  fetchMyProfilePhotoBlob,
}));

vi.mock('@/lib/api/profile-quality-api', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/profile-quality-api')
  >('@/lib/api/profile-quality-api');
  return {
    ...actual,
    fetchProfileQuality,
  };
});

vi.mock('@/lib/api/me-analysis-api', () => ({
  fetchMyLatestAnalysis,
  fetchAnalysisStatus: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', displayName: 'Test' },
    status: 'authenticated',
  }),
}));

let mockSearch = '';
let mockPathname = '/profile/overview';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: replaceMock,
    prefetch: vi.fn(),
  }),
}));

vi.mock('next/link', () => ({
  default({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';
import { ProfileHubShell } from '@/components/profile/profile-hub-shell';
import { ProfileOverviewPageClient } from './profile-overview-page-client';

function renderOverview() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(
        ProfileHubShell,
        null,
        createElement(ProfileOverviewPageClient),
      ),
    ),
  );
}

describe('Profile overview route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = '';
    mockPathname = '/profile/overview';
    window.location.hash = '';
    localStorage.clear();
    listMyProfilePhotos.mockResolvedValue([
      {
        id: 'p1',
        status: 'APPROVED',
        isPrimary: true,
        position: 0,
      },
    ]);
    fetchMyProfilePhotoBlob.mockRejectedValue(new Error('no blob in test'));
    fetchProfileQuality.mockResolvedValue({
      score: 80,
      completeness: {
        hasNickname: true,
        hasLocation: true,
        hasBasics: true,
        hasAboutMe: true,
        hasAboutPartner: true,
        hasAboutRelationship: false,
        hasApprovedPhoto: true,
      },
      suggestions: [{ id: 'aboutRelationship', points: 15 }],
    });
    fetchMyLatestAnalysis.mockResolvedValue(null);
    fetchMyProfile.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      nickname: 'Noa',
      birthDate: '1990-01-01',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'TLV',
      aboutMe: 'Hello',
      aboutPartner: 'Kind',
      aboutRelationship: 'Long term',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('shows overview, status strip score, and nav with aria-current', async () => {
    renderOverview();
    await waitFor(() => {
      expect(screen.getByTestId('profile-hub')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-tab')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-status-strip')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-score').textContent).toContain(
        '80%',
      );
    });
    expect(screen.queryByTestId('profile-quality-meter')).toBeNull();
    expect(screen.queryByTestId('profile-hub-tabs')).toBeNull();
    expect(screen.queryByTestId('profile-tab-overview')).toBeNull();
    expect(
      screen.getByTestId('profile-overview-strip-photos').getAttribute('href'),
    ).toBe('/profile/edit#photos');
    expect(
      screen
        .getByTestId('profile-overview-strip-matching')
        .getAttribute('href'),
    ).toBe('/profile/settings');
    expect(
      screen.getByTestId('profile-overview-strip-analysis').getAttribute('href'),
    ).toBe('/profile/analysis');
    expect(
      screen.getByTestId('profile-overview-strip-story').getAttribute('href'),
    ).toBe('/profile/edit');
  });

  it('renders overview hero card and edit CTA', async () => {
    renderOverview();
    await waitFor(() => {
      expect(screen.getByTestId('profile-overview-hero')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-edit')).toBeTruthy();
    });
    expect(screen.getByTestId('profile-overview-edit').getAttribute('href')).toBe(
      '/profile/edit',
    );
  });

  it('redirects legacy ?tab=edit preserving hash', async () => {
    mockSearch = 'tab=edit';
    window.location.hash = '#photos';
    renderOverview();
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/profile/edit#photos');
    });
    window.location.hash = '';
  });

  it('redirects settings tab with hash', async () => {
    mockSearch = 'tab=settings';
    window.location.hash = '#nickname';
    renderOverview();
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/profile/settings#nickname');
    });
  });

  it('strips unknown tab to /profile', async () => {
    mockSearch = 'tab=nope';
    window.location.hash = '';
    renderOverview();
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/profile/overview');
    });
  });

  it('renders Hebrew hub title when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderOverview();
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: heCopy.profile.hub.title,
        }),
      ).toBeTruthy();
    });
  });
});
