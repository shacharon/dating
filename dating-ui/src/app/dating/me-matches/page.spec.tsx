/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import type { MatchRecommendationDto } from '@/lib/me-matches-api';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';

const { fetchMyMatches, submitMyProfileForAnalysis, fetchMyProfile, listMyProfilePhotos, replaceMock } = vi.hoisted(() => ({
  fetchMyMatches: vi.fn(),
  submitMyProfileForAnalysis: vi.fn(),
  fetchMyProfile: vi.fn(),
  listMyProfilePhotos: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('@/lib/me-matches-api', () => ({
  fetchMyMatches,
}));

vi.mock('@/lib/me-profile-api', () => ({
  submitMyProfileForAnalysis,
  fetchMyProfile,
}));

vi.mock('@/lib/me-photos-api', () => ({
  listMyProfilePhotos,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'c123456789012345678901234' },
  }),
}));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

import MeMatchesPage from './me-matches-page-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('next/link', () => ({
  default ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href} {...props}>{children}</a>;
  },
}));

const baseMatch = {
  id: 'prof-cand-1',
  nickname: null as string | null,
  gender: 'FEMALE' as const,
  ageYears: 29,
  locationLabel: 'Tel Aviv',
  analyzedAt: '2026-04-18T00:00:00.000Z',
  hasEvaluation: true,
  matchScore: 70,
  explainability: {
    positiveChips: ['Emotional depth'],
    reasonShort: 'Aligned',
  },
  recommendation: null as MatchRecommendationDto | null,
};

describe('MeMatchesPage (empty list)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyProfile.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      locationLabel: 'Tel Aviv',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('renders actionable empty state when matches array is empty', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-list-empty-state')).toBeTruthy();
    });
    expect(screen.getByTestId('match-empty-edit-preferences')).toBeTruthy();
    expect(screen.getByTestId('match-empty-edit-profile')).toBeTruthy();
    expect(screen.getByTestId('match-empty-invite-copy')).toBeTruthy();
    unmount();
  });
});

describe('MeMatchesPage (not_ready photo gate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listMyProfilePhotos.mockResolvedValue([]);
  });

  it('stays on Matches and shows photo gate when reason is no_photo', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'not_ready',
      reason: 'no_photo',
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-list-photo-gate')).toBeTruthy();
    });
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('match-photo-gate-cta').getAttribute('href')).toBe(
      '/dating/profile#profile-photos',
    );
    expect(screen.getByText('Add a photo to see matches')).toBeTruthy();
    unmount();
  });

  it('shows pending-review copy when photos are PENDING', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'not_ready',
      reason: 'no_photo',
    });
    listMyProfilePhotos.mockResolvedValue([
      { id: 'ph1', status: 'PENDING' },
    ]);

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Your photo is still under review. Once it's approved, matches will appear here.",
        ),
      ).toBeTruthy();
    });
    expect(replaceMock).not.toHaveBeenCalled();
    unmount();
  });
});

describe('MeMatchesPage (viewer analysis stale)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders banner and Refresh analysis when viewerProfileAnalysisStale is true', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      viewerProfileAnalysisStale: true,
      matches: [baseMatch],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Your profile changed since the last analysis/),
      ).toBeTruthy();
    });
    expect(screen.getAllByTestId('matches-refresh-analysis').length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it('Refresh analysis calls submitMyProfileForAnalysis and refetches matches', async () => {
    let submitted = false;
    fetchMyMatches.mockImplementation(async () => {
      if (!submitted) {
        return {
          status: 'ready' as const,
          viewerProfileAnalysisStale: true,
          matches: [baseMatch],
        };
      }
      return {
        status: 'ready' as const,
        viewerProfileAnalysisStale: false,
        matches: [baseMatch],
      };
    });
    submitMyProfileForAnalysis.mockImplementation(async () => {
      submitted = true;
      return {
        id: 'p1',
        userId: 'u1',
        status: 'SUBMITTED',
        onboardingStep: 'COMPLETED',
        aboutMe: null,
        aboutPartner: null,
        aboutRelationship: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getAllByTestId('matches-refresh-analysis').length).toBeGreaterThanOrEqual(1);
    });

    const fetchCallsAfterLoad = fetchMyMatches.mock.calls.length;

    fireEvent.click(screen.getAllByTestId('matches-refresh-analysis')[0]!);

    await waitFor(() => {
      expect(submitMyProfileForAnalysis).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(fetchMyMatches.mock.calls.length).toBeGreaterThan(fetchCallsAfterLoad);
    });
    await waitFor(() => {
      const el = screen.getByTestId('matches-refresh-success');
      expect(el.textContent).toMatch(/Refresh started — scores will update once analysis completes/);
    });
    unmount();
  });

  it('does not render stale banner when viewerProfileAnalysisStale is false', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      viewerProfileAnalysisStale: false,
      matches: [baseMatch],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { level: 1, name: /Your matches/i }).length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(
      screen.queryByText(/Your profile changed since the last analysis/),
    ).toBeNull();
    unmount();
  });

  it('does not render stale banner when viewerProfileAnalysisStale is absent', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [baseMatch],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { level: 1, name: /Your matches/i }).length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(
      screen.queryByText(/Your profile changed since the last analysis/),
    ).toBeNull();
    unmount();
  });
});

describe('MeMatchesPage (yourAction badges)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Liked badge when yourAction is LIKE', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, yourAction: 'LIKE' as const }],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('You liked this match')).toBeTruthy();
      expect(screen.getByText('Liked')).toBeTruthy();
    });
    unmount();
  });

  it('shows Passed badge when yourAction is PASS', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, yourAction: 'PASS' as const }],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('You passed on this match')).toBeTruthy();
      expect(screen.getByText('Passed')).toBeTruthy();
    });
    unmount();
  });

  it('does not show action badge when yourAction is null', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, yourAction: null }],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { level: 1, name: /Your matches/i }).length,
      ).toBeGreaterThanOrEqual(1);
    });
    expect(screen.queryByLabelText('You liked this match')).toBeNull();
    expect(screen.queryByText('Liked')).toBeNull();
    expect(screen.queryByLabelText('You passed on this match')).toBeNull();
    unmount();
  });

  it('shows hard-blocked badge, reasons, and keeps Liked chip', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          yourAction: 'LIKE' as const,
          hardBlocked: {
            disabled: true as const,
            reasons: [
              {
                code: 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT',
                dimension: 'smoking',
                direction: 'viewer_to_them' as const,
                message: 'English fallback should not show',
                evidence: {
                  viewerQuote: "I don't want smokers",
                  counterpartyQuote: 'I smoke',
                },
              },
            ],
          },
        },
      ],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getByLabelText('This match is no longer eligible'),
      ).toBeTruthy();
    });
    expect(screen.getByText('No longer a match')).toBeTruthy();
    expect(screen.getByText('You liked this profile')).toBeTruthy();
    expect(
      screen.getByText(
        'This person smokes, while your preferences exclude smokers.',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/You: "I don't want smokers"/)).toBeTruthy();
    expect(screen.queryByText('Edit your story')).toBeNull();
    expect(screen.queryByText('→')).toBeNull();
    expect(screen.queryByText('70')).toBeNull();
    unmount();
  });

  it('shows nickname as primary label when provided', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, nickname: 'River', gender: 'FEMALE', ageYears: 29, locationLabel: 'Tel Aviv' }],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getByText('River')).toBeTruthy();
    });
    expect(screen.getByText(/FEMALE · 29y · Tel Aviv/)).toBeTruthy();
    unmount();
  });

  it('does not dump matchNarrative on list cards even if present on payload', async () => {
    const longNarrative =
      'You share a calm emotional pace across many sentences that must not appear on a list card. ';
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          // Runtime extra field (API should omit; UI must still ignore).
          matchNarrative: longNarrative.repeat(8),
          explainability: {
            positiveChips: ['Emotional depth'],
            reasonShort: 'You share real overlap on Ambition alignment, Emotional depth',
          },
          recommendation: {
            explainability: {
              positiveChips: ['Emotional depth'],
              reasonShort: 'You share real overlap on Ambition alignment, Emotional depth',
            },
            primaryTakeaway: 'Clear overlap: real depth and presence.',
            suggestedNextAction: 'Worth a closer look',
          },
        } as typeof baseMatch & { matchNarrative: string },
      ],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getByText('Clear overlap: real depth and presence.')).toBeTruthy();
    });
    expect(screen.queryByText(/Ambition alignment/)).toBeNull();
    expect(screen.queryByText(/calm emotional pace across many sentences/)).toBeNull();
    expect(document.body.textContent).not.toContain(longNarrative.repeat(2));
    unmount();
  });

  it('prefers primaryTakeaway over chip-jargon reasonShort on list', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          explainability: {
            positiveChips: ['Ambition alignment', 'Emotional depth'],
            reasonShort:
              'You share real overlap on Ambition alignment, Emotional depth, and …',
          },
          recommendation: {
            explainability: {
              positiveChips: ['Ambition alignment', 'Emotional depth'],
              reasonShort:
                'You share real overlap on Ambition alignment, Emotional depth, and …',
            },
            primaryTakeaway:
              'You both share a drive for goals and real depth and presence.',
            suggestedNextAction: 'Worth a closer look',
          },
        },
      ],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'You both share a drive for goals and real depth and presence.',
        ),
      ).toBeTruthy();
    });
    expect(screen.queryByText(/Ambition alignment/)).toBeNull();
    unmount();
  });

  it('omits list subtitle when primaryTakeaway missing (never reasonShort)', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          explainability: {
            positiveChips: ['Ambition alignment'],
            reasonShort:
              'You share real overlap on Ambition alignment and more jargon',
          },
          recommendation: {
            explainability: {
              positiveChips: ['Ambition alignment'],
              reasonShort:
                'You share real overlap on Ambition alignment and more jargon',
            },
            primaryTakeaway: '   ',
            suggestedNextAction: 'Worth a closer look',
          },
        },
      ],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Tel Aviv/)).toBeTruthy();
    });
    expect(screen.queryByText(/Ambition alignment/)).toBeNull();
    expect(
      screen.queryByText(/You share real overlap on Ambition/),
    ).toBeNull();
    unmount();
  });
});

describe('MeMatchesPage (blocked list exclusion)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render blocked match when API excludes them from list', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          id: 'prof-visible',
          gender: 'FEMALE' as const,
          locationLabel: 'Haifa',
        },
      ],
    });

    const { unmount } = render(<MeMatchesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Haifa/)).toBeTruthy();
    });
    expect(
      document.querySelector('a[href="/dating/me-matches/prof-blocked"]'),
    ).toBeNull();
    unmount();
  });
});

describe('MeMatchesPage (match photos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders photo thumbnail when primaryPhotoUrl is set', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          primaryPhotoUrl: '/api/v1/me/matches/prof-cand-1/photos/photo-1/file',
        },
      ],
    });

    render(<MeMatchesPage />);

    await waitFor(() => {
      const photo = screen.getByTestId('match-list-photo');
      expect(photo.tagName).toBe('IMG');
      expect(photo.getAttribute('src')).toBe(
        '/api/v1/me/matches/prof-cand-1/photos/photo-1/file',
      );
    });
  });

  it('renders placeholder when primaryPhotoUrl is null', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, primaryPhotoUrl: null }],
    });

    render(<MeMatchesPage />);

    await waitFor(() => {
      const photo = screen.getByTestId('match-list-photo');
      expect(photo.tagName).toBe('DIV');
      expect(photo.textContent).toBe('F');
    });
  });
});

describe('MeMatchesPage (i18n)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          yourAction: 'LIKE' as const,
          recommendation: {
            explainability: baseMatch.explainability,
            primaryTakeaway: 'Clear overlap: real depth and presence.',
            suggestedNextAction: 'Next',
          },
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders Hebrew list copy when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: heCopy.matches.list.title,
        }),
      ).toBeTruthy();
      expect(screen.getByText(heCopy.matches.list.subtitle)).toBeTruthy();
      expect(screen.getByText(heCopy.matches.list.actionBadge.liked.label)).toBeTruthy();
    });
  });

  it('still renders API list takeaway in English when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<MeMatchesPage />);

    await waitFor(() => {
      expect(
        screen.getByText('Clear overlap: real depth and presence.'),
      ).toBeTruthy();
    });
  });
});
