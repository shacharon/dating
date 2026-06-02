/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const {
  fetchMyMatchById,
  fetchMatchAction,
  likeMatch,
  passMatch,
  undoMatchAction,
  blockMatch,
  mockPush,
} = vi.hoisted(() => ({
  fetchMyMatchById: vi.fn(),
  fetchMatchAction: vi.fn(),
  likeMatch: vi.fn(),
  passMatch: vi.fn(),
  undoMatchAction: vi.fn(),
  blockMatch: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('@/lib/me-profile-api', () => ({
  fetchMyMatchById,
  fetchMatchAction,
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

import MeMatchDetailPage from './page';

const noActionState = {
  action: null as const,
  mutualMatch: false,
  conversationId: null,
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
