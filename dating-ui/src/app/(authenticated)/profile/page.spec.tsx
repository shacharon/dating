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
} = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  listMyProfilePhotos: vi.fn(),
  fetchMyProfilePhotoBlob: vi.fn(),
  fetchProfileQuality: vi.fn(),
}));

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

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'u1', displayName: 'Test' },
    status: 'authenticated',
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
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

vi.mock('@/components/profile/profile-edit-tab', () => ({
  ProfileEditTab: () => <div data-testid="profile-edit-tab">edit</div>,
}));
vi.mock('@/components/profile/profile-analysis-tab', () => ({
  ProfileAnalysisTab: () => (
    <div data-testid="profile-analysis-tab">analysis</div>
  ),
}));
vi.mock('@/components/notification-preferences-section', () => ({
  NotificationPreferencesSection: () => <div>notifications</div>,
}));

let mockSearch = '';

import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';
import ProfileHubClient from './profile-hub-client';

function renderHub() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(ProfileHubClient),
    ),
  );
}

describe('ProfileHubClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch = '';
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
  });

  it('defaults to overview tab and shows meter', async () => {
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId('profile-hub')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-tab')).toBeTruthy();
      expect(screen.getByTestId('profile-quality-meter')).toBeTruthy();
    });
    expect(screen.getByTestId('profile-tab-overview').getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('renders overview hero card and edit CTA', async () => {
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId('profile-overview-hero')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-edit')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-story-prose')).toBeTruthy();
    });
    expect(screen.getByTestId('profile-overview-edit').getAttribute('href')).toBe(
      '/profile?tab=edit',
    );
    expect(screen.queryByTestId('profile-analysis-link')).toBeNull();
    expect(screen.queryByTestId('photos')).toBeNull();
  });

  it('opens edit tab from ?tab=edit', async () => {
    mockSearch = 'tab=edit';
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId('profile-edit-tab')).toBeTruthy();
    });
  });

  it('falls back invalid tab to overview', async () => {
    mockSearch = 'tab=nope';
    renderHub();
    await waitFor(() => {
      expect(screen.getByTestId('profile-overview-tab')).toBeTruthy();
    });
  });

  it('renders Hebrew hub title when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderHub();
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
