/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const {
  fetchMyMatchById,
  fetchMatchAction,
  fetchMatchFeedback,
  upsertMatchFeedback,
  likeMatch,
  passMatch,
  undoMatchAction,
  blockMatch,
  mockPush,
} = vi.hoisted(() => ({
  fetchMyMatchById: vi.fn(),
  fetchMatchAction: vi.fn(),
  fetchMatchFeedback: vi.fn(),
  upsertMatchFeedback: vi.fn(),
  likeMatch: vi.fn(),
  passMatch: vi.fn(),
  undoMatchAction: vi.fn(),
  blockMatch: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/lib/me-profile-api', () => ({
  fetchMyMatchById,
  fetchMatchAction,
  fetchMatchFeedback,
  upsertMatchFeedback,
  likeMatch,
  passMatch,
  undoMatchAction,
  blockMatch,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'prof-cand-1' }),
  useRouter: () => ({ push: mockPush }),
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

import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';
import MeMatchDetailPage from './page';

const noActionState = {
  action: null as const,
  mutualMatch: false,
  conversationId: null,
};

const noFeedbackState = {
  sentiment: null as const,
};

const baseActionFields = {
  mutualMatch: false,
  conversationId: null,
};

const baseMatch = {
  id: 'prof-cand-1',
  nickname: null as string | null,
  gender: 'FEMALE' as const,
  ageYears: 29,
  locationLabel: 'Tel Aviv',
  analyzedAt: '2026-04-18T00:00:00.000Z',
  hasEvaluation: true,
  evaluationSummary: 'Warm and curious.',
  matchScore: 85,
  explainability: {
    positiveChips: ['Emotional depth'],
    reasonShort: 'Aligned values',
  },
  recommendation: null,
};

describe('MeMatchDetailPage (match actions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyMatchById.mockResolvedValue(baseMatch);
    fetchMatchAction.mockResolvedValue(noActionState);
    fetchMatchFeedback.mockResolvedValue(noFeedbackState);
    likeMatch.mockResolvedValue({
      id: 'action-1',
      actorUserId: 'user-1',
      targetUserId: 'user-2',
      targetProfileIdSnapshot: 'prof-cand-1',
      action: 'LIKE',
      createdAt: '2026-05-31T10:00:00.000Z',
      ...baseActionFields,
    });
    passMatch.mockResolvedValue({
      id: 'action-2',
      actorUserId: 'user-1',
      targetUserId: 'user-2',
      targetProfileIdSnapshot: 'prof-cand-1',
      action: 'PASS',
      createdAt: '2026-05-31T11:00:00.000Z',
      ...baseActionFields,
    });
    undoMatchAction.mockResolvedValue(undefined);
    blockMatch.mockResolvedValue({
      id: 'action-block',
      actorUserId: 'user-1',
      targetUserId: 'user-2',
      targetProfileIdSnapshot: 'prof-cand-1',
      action: 'BLOCK',
      createdAt: '2026-05-31T12:00:00.000Z',
      ...baseActionFields,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows Like and Pass buttons when no action', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /^pass$/i })).toBeTruthy();
    });
  });

  it('shows hard-blocked banner and hides Like/Pass when hardBlocked', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      hardBlocked: {
        disabled: true as const,
        reasons: [
          {
            code: 'DB_SMOKING_EXCLUDED_TRAIT_PRESENT',
            dimension: 'smoking',
            direction: 'viewer_to_them' as const,
            message: 'fallback',
            evidence: {
              viewerQuote: "I don't want smokers",
              counterpartyQuote: 'I smoke',
            },
          },
        ],
      },
    });
    fetchMatchAction.mockResolvedValue(noActionState);

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-detail-hard-blocked')).toBeTruthy();
    });
    expect(screen.getByText('No longer a match')).toBeTruthy();
    expect(
      screen.getByText(
        'This person smokes, while your preferences exclude smokers.',
      ),
    ).toBeTruthy();
    const prefsLink = screen.getByRole('link', { name: 'Review preferences' });
    expect(prefsLink.getAttribute('href')).toBe('/settings/preferences');
    expect(screen.queryByRole('button', { name: /^like$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^pass$/i })).toBeNull();
    expect(
      screen.getByText(
        /Like and Pass are unavailable while this match is blocked by preferences/,
      ),
    ).toBeTruthy();
  });

  it('shows decorative heart on Like button with text accessible name', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      const likeBtn = screen.getByRole('button', { name: /^like$/i });
      const heart = likeBtn.querySelector('span[aria-hidden="true"]');
      expect(heart?.textContent).toBe('❤️');
    });
  });

  it('records like on Like click', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^like$/i }));

    await waitFor(() => {
      expect(likeMatch).toHaveBeenCalledWith('prof-cand-1');
    });
    await waitFor(() => {
      expect(screen.getByText('You liked this person')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: /^like$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^pass$/i })).toBeNull();
  });

  it('records pass on Pass click', async () => {
    fetchMatchAction
      .mockResolvedValueOnce(noActionState)
      .mockResolvedValueOnce({
        action: 'PASS',
        createdAt: '2026-05-31T11:00:00.000Z',
        ...baseActionFields,
      });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^pass$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^pass$/i }));

    await waitFor(() => {
      expect(passMatch).toHaveBeenCalledWith('prof-cand-1');
    });
    await waitFor(() => {
      expect(screen.getByText('You passed on this person')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: /^like$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^pass$/i })).toBeNull();
  });

  it('shows error when like fails', async () => {
    likeMatch.mockRejectedValue(new Error('Network error'));

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^like$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
    expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^pass$/i })).toBeTruthy();
  });

  it('shows liked state from fetchMatchAction on load', async () => {
    fetchMatchAction.mockResolvedValue({
      action: 'LIKE',
      createdAt: '2026-05-31T10:00:00.000Z',
      ...baseActionFields,
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('You liked this person')).toBeTruthy();
      expect(screen.getByRole('button', { name: /undo your like on this match/i })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /^like$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^pass$/i })).toBeNull();
    });
  });

  it('shows passed state from fetchMatchAction on load', async () => {
    fetchMatchAction.mockResolvedValue({
      action: 'PASS',
      createdAt: '2026-05-31T11:00:00.000Z',
      ...baseActionFields,
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('You passed on this person')).toBeTruthy();
      expect(screen.getByRole('button', { name: /undo your pass on this match/i })).toBeTruthy();
      expect(screen.queryByRole('button', { name: /^like$/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /^pass$/i })).toBeNull();
    });
  });

  it('does not show Undo when action is BLOCK', async () => {
    fetchMatchAction.mockResolvedValue({
      action: 'BLOCK',
      createdAt: '2026-05-31T12:00:00.000Z',
      ...baseActionFields,
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('You blocked this person')).toBeTruthy();
    });
    expect(screen.queryByRole('button', { name: /undo/i })).toBeNull();
  });

  it('restores Like and Pass after undo on liked match', async () => {
    fetchMatchAction
      .mockResolvedValueOnce({
        action: 'LIKE',
        createdAt: '2026-05-31T10:00:00.000Z',
        ...baseActionFields,
      })
      .mockResolvedValueOnce(noActionState);

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /undo your like on this match/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /undo your like on this match/i }));

    await waitFor(() => {
      expect(undoMatchAction).toHaveBeenCalledWith('prof-cand-1');
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /^pass$/i })).toBeTruthy();
    });
    expect(screen.queryByText('You liked this person')).toBeNull();
  });

  it('restores Like and Pass after undo on passed match', async () => {
    fetchMatchAction
      .mockResolvedValueOnce({
        action: 'PASS',
        createdAt: '2026-05-31T11:00:00.000Z',
        ...baseActionFields,
      })
      .mockResolvedValueOnce(noActionState);

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /undo your pass on this match/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /undo your pass on this match/i }));

    await waitFor(() => {
      expect(undoMatchAction).toHaveBeenCalledWith('prof-cand-1');
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /^pass$/i })).toBeTruthy();
    });
    expect(screen.queryByText('You passed on this person')).toBeNull();
  });

  it('shows Block button on load', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^block$/i })).toBeTruthy();
    });
  });

  it('shows confirm copy when Block is clicked', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^block$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^block$/i }));

    expect(screen.getByText("Are you sure? This can't be undone.")).toBeTruthy();
    expect(screen.getByRole('button', { name: /block permanently/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeTruthy();
  });

  it('Cancel hides confirm without calling blockMatch', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^block$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^block$/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByText("Are you sure? This can't be undone.")).toBeNull();
    expect(blockMatch).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^block$/i })).toBeTruthy();
  });

  it('calls blockMatch and redirects on confirm', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^block$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^block$/i }));
    fireEvent.click(screen.getByRole('button', { name: /block permanently/i }));

    await waitFor(() => {
      expect(blockMatch).toHaveBeenCalledWith('prof-cand-1');
      expect(mockPush).toHaveBeenCalledWith('/dating/me-matches');
    });
  });

  it('shows Block when liked state is loaded', async () => {
    fetchMatchAction.mockResolvedValue({
      action: 'LIKE',
      createdAt: '2026-05-31T10:00:00.000Z',
      ...baseActionFields,
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('You liked this person')).toBeTruthy();
      expect(screen.getByRole('button', { name: /undo your like on this match/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /^block$/i })).toBeTruthy();
    });
  });
});

describe('MeMatchDetailPage (mutual match notification)', () => {
  const mutualLikeResult = {
    id: 'action-mutual',
    actorUserId: 'user-1',
    targetUserId: 'user-2',
    targetProfileIdSnapshot: 'prof-cand-1',
    action: 'LIKE' as const,
    createdAt: '2026-05-31T10:00:00.000Z',
    mutualMatch: true,
    conversationId: 'mutual_row_1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      nickname: 'Rivka',
      primaryPhotoUrl: '/api/v1/me/matches/prof-cand-1/photos/photo-1/file',
    });
    fetchMatchAction.mockResolvedValue(noActionState);
    likeMatch.mockResolvedValue(mutualLikeResult);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows celebration modal when like returns mutualMatch true', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^like$/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByText("It's a match!")).toBeTruthy();
    });
    expect(screen.getByRole('dialog').textContent).toContain('Rivka');
    const photo = screen.getByTestId('match-celebration-photo');
    expect(photo.tagName).toBe('IMG');
    expect(photo.getAttribute('src')).toBe(
      '/api/v1/me/matches/prof-cand-1/photos/photo-1/file',
    );
  });

  it('navigates to conversation when Send a message is clicked', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^like$/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /send a message/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /send a message/i }));

    expect(mockPush).toHaveBeenCalledWith('/dating/conversations/mutual_row_1');
  });

  it('hides modal when close is clicked', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^like$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^like$/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(screen.getByText('You matched!')).toBeTruthy();
  });

  it('shows You matched badge when fetchMatchAction returns mutual on load', async () => {
    fetchMatchAction.mockResolvedValue({
      action: 'LIKE',
      createdAt: '2026-05-31T10:00:00.000Z',
      mutualMatch: true,
      conversationId: 'mutual_row_1',
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('You matched!')).toBeTruthy();
      const link = screen.getByRole('link', { name: /view conversation/i });
      expect(link.getAttribute('href')).toBe('/dating/conversations/mutual_row_1');
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('MeMatchDetailPage (match photos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyMatchById.mockResolvedValue(baseMatch);
    fetchMatchAction.mockResolvedValue(noActionState);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders hero photo when primaryPhotoUrl is set', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      primaryPhotoUrl: '/api/v1/me/matches/prof-cand-1/photos/photo-1/file',
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      const photo = screen.getByTestId('match-detail-photo');
      expect(photo.tagName).toBe('IMG');
      expect(photo.getAttribute('src')).toBe(
        '/api/v1/me/matches/prof-cand-1/photos/photo-1/file',
      );
    });
  });

  it('renders placeholder hero when primaryPhotoUrl is null', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      primaryPhotoUrl: null,
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      const photo = screen.getByTestId('match-detail-photo');
      expect(photo.tagName).toBe('DIV');
      expect(photo.textContent).toBe('F');
    });
  });

  it('opens report dialog from match detail footer', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-detail-report')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('match-detail-report'));

    expect(screen.getByTestId('report-user-dialog')).toBeTruthy();
  });
});

describe('MeMatchDetailPage (human-first layout)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMatchAction.mockResolvedValue(noActionState);
    fetchMatchFeedback.mockResolvedValue(noFeedbackState);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows takeaway before de-emphasized score label', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      matchScore: 72,
      explainability: {
        positiveChips: ['Shared values'],
        reasonShort: 'Strong alignment on communication style',
      },
      recommendation: {
        primaryTakeaway: 'You both prioritize honest, calm connection.',
        caution: null,
      },
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-detail-takeaway')).toBeTruthy();
      expect(screen.getByTestId('match-detail-score')).toBeTruthy();
    });

    const takeaway = screen.getByTestId('match-detail-takeaway');
    const score = screen.getByTestId('match-detail-score');
    expect(
      takeaway.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(score.textContent).toBe('Match score · 72');
    expect(score.className).toContain('text-sm');
    expect(document.querySelector('.text-2xl')).toBeNull();
  });

  it('renders sharedInterestNote when present', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      explainability: {
        positiveChips: ['Shared values'],
        reasonShort: 'Aligned',
        sharedInterestNote: 'You both enjoy hiking, extreme_sports.',
      },
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-detail-shared-interests')).toBeTruthy();
    });
    expect(screen.getByTestId('match-detail-shared-interests').textContent).toBe(
      'You both enjoy Hiking, Extreme sports.',
    );
  });

  it('omits sharedInterestNote when absent', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      explainability: {
        positiveChips: ['Shared values'],
        reasonShort: 'Aligned',
      },
      recommendation: {
        primaryTakeaway: 'Clear overlap: common ground on daily life.',
        caution: null,
        suggestedNextAction: 'Next',
        explainability: {
          positiveChips: ['Shared values'],
          reasonShort: 'Aligned',
        },
      },
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-detail-takeaway')).toBeTruthy();
    });
    expect(screen.getByTestId('match-detail-takeaway').textContent).toBe(
      'Clear overlap: common ground on daily life.',
    );
    expect(screen.queryByTestId('match-detail-shared-interests')).toBeNull();
    expect(screen.queryByText(/^Aligned$/)).toBeNull();
  });

  it('renders matchNarrative and hides short takeaway when both present', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      matchNarrative:
        'You share a calm emotional pace.\n\nAmbition shows up in how you both plan.',
      explainability: {
        positiveChips: ['Emotional depth'],
        reasonShort: 'Aligned values',
        sharedInterestNote: 'You both enjoy hiking.',
      },
      recommendation: {
        primaryTakeaway: 'Short takeaway should not show.',
        caution: null,
        suggestedNextAction: 'Say hello',
        explainability: {
          positiveChips: ['Emotional depth'],
          reasonShort: 'Aligned values',
        },
      },
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-detail-narrative')).toBeTruthy();
    });
    const narrative = screen.getByTestId('match-detail-narrative');
    expect(narrative.textContent).toContain('calm emotional pace');
    expect(narrative.textContent).toContain('Ambition shows up');
    expect(narrative.querySelectorAll('p').length).toBe(2);
    expect(screen.queryByTestId('match-detail-takeaway')).toBeNull();
    expect(screen.getByTestId('match-detail-shared-interests')).toBeTruthy();
    expect(screen.getByTestId('match-detail-chips')).toBeTruthy();
  });

  it('falls back to short takeaway when matchNarrative is absent', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      explainability: {
        positiveChips: ['Shared values'],
        reasonShort: 'Fallback reason short',
      },
      recommendation: {
        primaryTakeaway: 'Fallback primary takeaway',
        caution: null,
        suggestedNextAction: 'Next',
        explainability: {
          positiveChips: ['Shared values'],
          reasonShort: 'Fallback reason short',
        },
      },
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-detail-takeaway')).toBeTruthy();
    });
    expect(screen.getByTestId('match-detail-takeaway').textContent).toBe(
      'Fallback primary takeaway',
    );
    expect(screen.queryByTestId('match-detail-narrative')).toBeNull();
  });

  it('omits prose block when narrative and short takeaway are both empty', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      matchNarrative: '   ',
      explainability: {
        positiveChips: ['Shared values'],
        reasonShort: 'You share real overlap on Ambition alignment',
      },
      recommendation: null,
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-detail-chips')).toBeTruthy();
    });
    expect(screen.queryByTestId('match-detail-narrative')).toBeNull();
    expect(screen.queryByTestId('match-detail-takeaway')).toBeNull();
    expect(screen.queryByText(/Ambition alignment/)).toBeNull();
  });

  it('shows feedback section before de-emphasized score label', async () => {
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      matchScore: 72,
      explainability: {
        positiveChips: ['Shared values'],
        reasonShort: 'Strong alignment on communication style',
      },
      recommendation: {
        primaryTakeaway: 'You both prioritize honest, calm connection.',
        caution: null,
      },
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-feedback')).toBeTruthy();
      expect(screen.getByTestId('match-detail-score')).toBeTruthy();
    });

    const feedback = screen.getByTestId('match-feedback');
    const score = screen.getByTestId('match-detail-score');
    expect(
      feedback.compareDocumentPosition(score) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('MeMatchDetailPage (match feedback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyMatchById.mockResolvedValue(baseMatch);
    fetchMatchAction.mockResolvedValue(noActionState);
    fetchMatchFeedback.mockResolvedValue(noFeedbackState);
    upsertMatchFeedback.mockResolvedValue({
      matchProfileId: 'prof-cand-1',
      sentiment: 'POSITIVE',
      createdAt: '2026-06-06T10:00:00.000Z',
      updatedAt: '2026-06-06T10:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('reflects loaded feedback sentiment on positive thumb', async () => {
    fetchMatchFeedback.mockResolvedValue({ sentiment: 'POSITIVE' });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-feedback-positive')).toBeTruthy();
    });

    expect(
      screen.getByTestId('match-feedback-positive').getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByTestId('match-feedback-negative').getAttribute('aria-pressed'),
    ).toBe('false');
    expect(screen.queryByTestId('match-feedback-thanks')).toBeNull();
  });

  it('clicking thumbs up submits feedback and shows thanks', async () => {
    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-feedback-positive')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('match-feedback-positive'));

    await waitFor(() => {
      expect(upsertMatchFeedback).toHaveBeenCalledWith('prof-cand-1', 'positive');
      expect(screen.getByTestId('match-feedback-thanks')).toBeTruthy();
    });

    expect(screen.getByTestId('match-feedback-thanks').textContent).toBe(
      'Thanks for your feedback.',
    );
  });

  it('switching to thumbs down updates selected state', async () => {
    upsertMatchFeedback
      .mockResolvedValueOnce({
        matchProfileId: 'prof-cand-1',
        sentiment: 'POSITIVE',
        createdAt: '2026-06-06T10:00:00.000Z',
        updatedAt: '2026-06-06T10:00:00.000Z',
      })
      .mockResolvedValueOnce({
        matchProfileId: 'prof-cand-1',
        sentiment: 'NEGATIVE',
        createdAt: '2026-06-06T10:00:00.000Z',
        updatedAt: '2026-06-06T11:00:00.000Z',
      });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('match-feedback-positive')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('match-feedback-positive'));
    await waitFor(() => {
      expect(screen.getByTestId('match-feedback-thanks')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('match-feedback-negative'));

    await waitFor(() => {
      expect(upsertMatchFeedback).toHaveBeenLastCalledWith(
        'prof-cand-1',
        'negative',
      );
      expect(
        screen.getByTestId('match-feedback-negative').getAttribute('aria-pressed'),
      ).toBe('true');
    });
  });
});

describe('MeMatchDetailPage (i18n)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fetchMyMatchById.mockResolvedValue({
      ...baseMatch,
      recommendation: {
        primaryTakeaway: 'You both prioritize honest, calm connection.',
        caution: null,
        suggestedNextAction: 'Next',
        explainability: baseMatch.explainability,
      },
    });
    fetchMatchAction.mockResolvedValue(noActionState);
    fetchMatchFeedback.mockResolvedValue(noFeedbackState);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders Hebrew detail chrome when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      const likeBtn = screen.getByRole('button', {
        name: heCopy.matches.detail.like,
      });
      expect(likeBtn.querySelector('span[aria-hidden="true"]')?.textContent).toBe(
        '❤️',
      );
      expect(
        screen.getByRole('button', { name: heCopy.matches.detail.pass }),
      ).toBeTruthy();
      expect(screen.getByText(heCopy.matches.detail.matchLabel)).toBeTruthy();
      expect(screen.getByText(heCopy.matches.detail.aboutThem)).toBeTruthy();
      expect(screen.getByText(heCopy.matches.detail.backToMatches)).toBeTruthy();
    });
  });

  it('still renders API takeaway in English when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText('You both prioritize honest, calm connection.'),
      ).toBeTruthy();
      expect(screen.getByText('Emotional depth')).toBeTruthy();
      expect(screen.queryByText('Aligned values')).toBeNull();
    });
  });

  it('shows Hebrew celebration title when locale is he and like is mutual', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    likeMatch.mockResolvedValue({
      id: 'action-mutual',
      actorUserId: 'user-1',
      targetUserId: 'user-2',
      targetProfileIdSnapshot: 'prof-cand-1',
      action: 'LIKE',
      createdAt: '2026-05-31T10:00:00.000Z',
      mutualMatch: true,
      conversationId: 'mutual_row_1',
    });

    render(<MeMatchDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: heCopy.matches.detail.like }),
      ).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole('button', { name: heCopy.matches.detail.like }),
    );

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(
        screen.getByRole('heading', {
          level: 2,
          name: heCopy.matches.celebration.title,
        }),
      ).toBeTruthy();
    });
  });
});
