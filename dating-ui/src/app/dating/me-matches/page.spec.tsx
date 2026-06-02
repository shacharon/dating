/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { MatchRecommendationDto } from '@/lib/me-profile-api';

const { fetchMyMatches, submitMyProfileForAnalysis } = vi.hoisted(() => ({
  fetchMyMatches: vi.fn(),
  submitMyProfileForAnalysis: vi.fn(),
}));

vi.mock('@/lib/me-profile-api', () => ({
  fetchMyMatches,
  submitMyProfileForAnalysis,
}));

import MeMatchesPage from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
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
