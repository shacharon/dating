/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { ProfileOverviewTab } from '@/components/profile/profile-overview-tab';
import { ProfileQualityRefreshProvider } from '@/components/profile/profile-quality-refresh-context';

const {
  listMyProfilePhotos,
  fetchMyProfilePhotoBlob,
  fetchProfileQuality,
  fetchMyLatestAnalysis,
} = vi.hoisted(() => ({
  listMyProfilePhotos: vi.fn(),
  fetchMyProfilePhotoBlob: vi.fn(),
  fetchProfileQuality: vi.fn(),
  fetchMyLatestAnalysis: vi.fn(),
}));

vi.mock('@/lib/api/me-photos-api', () => ({
  listMyProfilePhotos,
  fetchMyProfilePhotoBlob,
}));

vi.mock('@/lib/api/profile-quality-api', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/api/profile-quality-api')
  >('@/lib/api/profile-quality-api');
  return { ...actual, fetchProfileQuality };
});

vi.mock('@/lib/api/me-analysis-api', () => ({
  fetchMyLatestAnalysis,
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

function emptyDraft(): ProfileDraft {
  return {
    nickname: '',
    aboutMe: '',
    aboutPartner: '',
    aboutRelationship: '',
    birthDate: '',
    gender: '',
    desiredPartnerGenders: [],
    city: '',
    country: '',
    locationLabel: '',
  };
}

function renderTab(draft: ProfileDraft) {
  return render(
    createElement(
      ProfileQualityRefreshProvider,
      null,
      createElement(ProfileOverviewTab, { draft }),
    ),
  );
}

describe('ProfileOverviewTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMyProfilePhotos.mockResolvedValue([]);
    fetchMyProfilePhotoBlob.mockRejectedValue(new Error('no blob'));
    fetchProfileQuality.mockResolvedValue({
      score: 0,
      completeness: {
        hasNickname: false,
        hasLocation: false,
        hasBasics: false,
        hasAboutMe: false,
        hasAboutPartner: false,
        hasAboutRelationship: false,
        hasApprovedPhoto: false,
      },
      suggestions: [],
    });
    fetchMyLatestAnalysis.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows designed empty photo/story and omits chips when brand-new', async () => {
    renderTab(emptyDraft());

    await waitFor(() => {
      expect(screen.getByTestId('profile-overview-framing')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-photo-empty')).toBeTruthy();
      expect(screen.getByTestId('profile-overview-story-empty')).toBeTruthy();
    });

    expect(screen.queryByTestId('profile-overview-trait-chips')).toBeNull();
    expect(screen.queryByTestId('profile-overview-gallery-dots')).toBeNull();
    expect(screen.queryByTestId('profile-quality-meter')).toBeNull();
    expect(
      screen.getByTestId('profile-overview-photo-empty').textContent,
    ).not.toMatch(/\?/);
    expect(
      screen.getByTestId('profile-overview-strip-photos').getAttribute('href'),
    ).toBe('/profile/edit#photos');
    expect(
      screen.getByTestId('profile-overview-edit').getAttribute('href'),
    ).toBe('/profile/edit');
  });

  it('renders trait chips when evaluation highlights exist', async () => {
    fetchMyLatestAnalysis.mockResolvedValue({
      userProfileId: 'p1',
      evaluationId: 'e1',
      createdAt: '2026-01-01T00:00:00.000Z',
      evaluationJson: {
        chips: { self: [{ label: 'Curious' }, { label: 'Kind' }] },
      },
    });

    renderTab({
      ...emptyDraft(),
      nickname: 'Noa',
      aboutMe: 'I love hiking and coffee.',
    });

    await waitFor(() => {
      expect(screen.getByTestId('profile-overview-trait-chips')).toBeTruthy();
    });
    const chips = screen.getByTestId('profile-overview-trait-chips');
    expect(chips.textContent).toContain('Curious');
    expect(chips.textContent).toContain('Kind');
    expect(screen.queryByTestId('profile-overview-story-empty')).toBeNull();
  });
});
