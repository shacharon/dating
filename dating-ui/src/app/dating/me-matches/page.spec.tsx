/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import type { MatchRecommendationDto } from '@/lib/me-matches-api';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyMatches, submitMyProfileForAnalysis, fetchMyProfile, listMyProfilePhotos, replaceMock, pushMock, likeMatch, passMatch, undoMatchAction, fetchMatchAction, emitProductLog } = vi.hoisted(() => ({
  fetchMyMatches: vi.fn(),
  submitMyProfileForAnalysis: vi.fn(),
  fetchMyProfile: vi.fn(),
  listMyProfilePhotos: vi.fn(),
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
  likeMatch: vi.fn(),
  passMatch: vi.fn(),
  undoMatchAction: vi.fn(),
  fetchMatchAction: vi.fn(),
  emitProductLog: vi.fn(),
}));

vi.mock('@/lib/me-matches-api', () => ({
  fetchMyMatches,
  likeMatch,
  passMatch,
  undoMatchAction,
  fetchMatchAction,
  blockMatch: vi.fn(),
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

vi.mock('@/lib/observability/product-logger', () => ({
  emitProductLog,
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
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockDynamic() {
      return null;
    },
}));

vi.mock('next/link', () => ({
  default ({
    children,
    href,
    scroll: _scroll,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    scroll?: boolean;
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
  matchScore: 90,
  priorityScore: 90,
  priorityTier: 'HIGH' as const,
  explainability: {
    positiveChips: ['Emotional depth'],
    reasonShort: 'Aligned',
  },
  recommendation: null as MatchRecommendationDto | null,
};

function renderPage(ui: React.ReactElement = <MeMatchesPage />) {
  return render(
    <QueryClientTestProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientTestProvider>,
  );
}

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

    const { unmount } = renderPage();

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

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-list-photo-gate')).toBeTruthy();
    });
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('match-photo-gate-cta').getAttribute('href')).toBe(
      '/profile?tab=edit#photos',
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

    const { unmount } = renderPage();

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

describe('MeMatchesPage (not_ready analysis redirect)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to hub analysis when not_ready reason is not_analyzed', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'not_ready',
      reason: 'not_analyzed',
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/profile?tab=analysis');
    });
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

    const { unmount } = renderPage();

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

    const { unmount } = renderPage();

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

    const { unmount } = renderPage();

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

    const { unmount } = renderPage();

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

  it('shows liked status when yourAction is LIKE', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, yourAction: 'LIKE' as const }],
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByText('You liked this person')).toBeTruthy();
    });
    expect(screen.queryByTestId('match-browse-like')).toBeNull();
    unmount();
  });

  it('shows passed status when yourAction is PASS', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, yourAction: 'PASS' as const }],
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByText('You passed on this person')).toBeTruthy();
    });
    expect(screen.queryByTestId('match-browse-like')).toBeNull();
    unmount();
  });

  it('shows Like/Pass when yourAction is null', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, yourAction: null }],
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-browse-like')).toBeTruthy();
      expect(screen.getByTestId('match-browse-pass')).toBeTruthy();
    });
    expect(screen.queryByText('You liked this person')).toBeNull();
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

    const { unmount } = renderPage();

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
    expect(screen.queryByText('90')).toBeNull();
    expect(screen.queryByTestId('match-browse-card')).toBeNull();
    unmount();
  });

  it('shows nickname, age, and location on photo-first card', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, nickname: 'River', gender: 'FEMALE', ageYears: 29, locationLabel: 'Tel Aviv' }],
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-browse-name').textContent).toMatch(/River/);
      expect(screen.getByTestId('match-browse-name').textContent).toMatch(/29/);
    });
    expect(screen.getByTestId('match-browse-location').textContent).toBe('Tel Aviv');
    expect(screen.queryByText(/FEMALE · 29y · Tel Aviv/)).toBeNull();
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
          teaser: {
            mode: 'first_chapter' as const,
            lines: ['Clear overlap: real depth and presence.'],
            showScore: true,
            score: 90,
          },
        } as typeof baseMatch & { matchNarrative: string },
      ],
    });

    const { unmount } = renderPage();

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
          teaser: {
            mode: 'first_chapter' as const,
            lines: [
              'You both share a drive for goals and real depth and presence.',
            ],
            showScore: true,
            score: 90,
          },
        },
      ],
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(
          'You both share a drive for goals and real depth and presence.',
        ),
      ).toBeTruthy();
    });
    expect(screen.queryByText(/Ambition alignment/)).toBeNull();
    expect(screen.getByTestId('match-why-toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
    unmount();
  });

  it('shows Mode A empty hook when teaser lines missing (never reasonShort)', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          explainability: {
            positiveChips: [],
            reasonShort:
              'You share real overlap on Ambition alignment and more jargon',
          },
          recommendation: {
            explainability: {
              positiveChips: [],
              reasonShort:
                'You share real overlap on Ambition alignment and more jargon',
            },
            primaryTakeaway: '   ',
            suggestedNextAction: 'Worth a closer look',
          },
        },
      ],
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-browse-card')).toBeTruthy();
    });
    expect(screen.getByTestId('match-browse-hook').textContent).toBe(
      'A little in common — open to see more',
    );
    expect(
      screen.queryByText(/You share real overlap on Ambition/),
    ).toBeNull();
    unmount();
  });

  it('expands why section and shows chips', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          recommendation: {
            explainability: {
              positiveChips: ['Emotional depth'],
              reasonShort: 'Aligned',
            },
            primaryTakeaway: 'Clear overlap: real depth and presence.',
            suggestedNextAction: 'Next',
          },
        },
      ],
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-why-toggle')).toBeTruthy();
    });
    expect(
      document
        .querySelector('[data-testid="match-why-panel"]')
        ?.hasAttribute('hidden'),
    ).toBe(true);
    fireEvent.click(screen.getByTestId('match-why-toggle'));
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-testid="match-why-panel"]')
          ?.hasAttribute('hidden'),
      ).toBe(false);
    });
    expect(screen.getByTestId('match-why-chips')).toBeTruthy();
    expect(
      screen.getByText(
        'You both value depth and emotional presence in a relationship',
      ),
    ).toBeTruthy();
    unmount();
  });
});

describe('MeMatchesPage (blocked list exclusion)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
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

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-browse-location').textContent).toBe(
        'Haifa',
      );
    });
    expect(
      document.querySelector('a[href="/dating/me-matches/prof-blocked"]'),
    ).toBeNull();
  });
});

describe('MeMatchesPage (match photos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders browse photo when primaryPhotoUrl is set', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          primaryPhotoUrl: '/api/v1/me/matches/prof-cand-1/photos/photo-1/file',
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      const photos = screen.getAllByTestId('match-browse-photo');
      const photo = photos[0]!;
      expect(photo.tagName).toBe('IMG');
      expect(photo.getAttribute('src')).toBe(
        '/api/v1/me/matches/prof-cand-1/photos/photo-1/file',
      );
    });
    expect(
      screen.getAllByTestId('match-browse-photo-region')[0]!.className,
    ).toMatch(/h-\[70vh\]/);
  });

  it('renders placeholder when primaryPhotoUrl is null', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseMatch, primaryPhotoUrl: null }],
    });

    renderPage();

    await waitFor(() => {
      const photo = screen.getByTestId('match-browse-photo');
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
          teaser: {
            mode: 'first_chapter' as const,
            lines: ['Clear overlap: real depth and presence.'],
            showScore: true,
            score: 90,
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

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: heCopy.matches.list.title,
        }),
      ).toBeTruthy();
      expect(screen.getByText(heCopy.matches.list.subtitle)).toBeTruthy();
      expect(
        screen.getByText(heCopy.matches.detail.actionStatus.liked),
      ).toBeTruthy();
    });
  });

  it('still renders API list takeaway in English when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('Clear overlap: real depth and presence.'),
      ).toBeTruthy();
    });
  });
});

describe('MeMatchesPage (priority sections)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows HIGH section expanded and omits empty GOOD', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          id: 'high-1',
          matchScore: 90,
          priorityScore: 90,
          priorityTier: 'HIGH',
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-priority-section-high')).toBeTruthy();
    });
    expect(screen.getByText(/Message these first/)).toBeTruthy();
    expect(screen.getByTestId('match-browse-card')).toBeTruthy();
    expect(screen.getByTestId('match-browse-score-badge').textContent).toBe(
      '90%',
    );
    expect(screen.queryByTestId('match-priority-section-good')).toBeNull();
  });

  it('collapses GOOD by default and expands on toggle', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          id: 'good-1',
          matchScore: 75,
          priorityScore: 75,
          priorityTier: 'GOOD',
          nickname: 'GoodOne',
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-priority-toggle-good')).toBeTruthy();
    });
    expect(screen.queryByTestId('match-priority-section-high')).toBeNull();
    expect(
      document
        .querySelector('[data-testid="match-priority-panel-good"]')
        ?.hasAttribute('hidden'),
    ).toBe(true);
    fireEvent.click(screen.getByTestId('match-priority-toggle-good'));
    await waitFor(() => {
      expect(
        document
          .querySelector('[data-testid="match-priority-panel-good"]')
          ?.hasAttribute('hidden'),
      ).toBe(false);
    });
    expect(screen.getByText('GoodOne')).toBeTruthy();
    expect(emitProductLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'match.priority_section_expanded',
        meta: expect.objectContaining({
          event: 'match.priority_section_expanded',
          tier: 'GOOD',
        }),
      }),
    );
  });

  it('keeps hard-blocked outside priority card stacks', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          ...baseMatch,
          id: 'blocked-1',
          yourAction: 'LIKE' as const,
          hardBlocked: {
            disabled: true as const,
            reasons: [
              {
                code: 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT',
                dimension: 'smoking',
                direction: 'viewer_to_them' as const,
                message: 'x',
              },
            ],
          },
        },
      ],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('match-priority-blocked-trailer')).toBeTruthy();
    });
    expect(screen.queryByTestId('match-browse-card')).toBeNull();
    expect(screen.getByText('No longer a match')).toBeTruthy();
  });
});
