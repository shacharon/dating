/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { enCopy } from '@/lib/i18n/en';
import type { MeMatchItemDto } from '@/lib/me-matches-api';

const { likeMatch, passMatch, emitProductLog, postOpenerLifecycleBestEffort } =
  vi.hoisted(() => ({
    likeMatch: vi.fn(),
    passMatch: vi.fn(),
    emitProductLog: vi.fn(),
    postOpenerLifecycleBestEffort: vi.fn(),
  }));

vi.mock('@/lib/me-matches-api', () => ({
  likeMatch,
  passMatch,
  undoMatchAction: vi.fn(),
  fetchMatchAction: vi.fn(),
  blockMatch: vi.fn(),
  postOpenerLifecycleBestEffort,
}));

vi.mock('@/lib/observability/product-logger', () => ({
  emitProductLog,
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
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

vi.mock('@/components/match-photo', () => ({
  MatchPhoto: ({
    testId = 'match-browse-photo',
    displayName,
  }: {
    testId?: string;
    displayName: string;
  }) => <div data-testid={testId}>{displayName}</div>,
}));

import { MatchBrowseCard } from './match-browse-card';

const match = {
  id: 'prof-1',
  nickname: 'Sara',
  gender: 'FEMALE',
  ageYears: 32,
  locationLabel: 'Tel Aviv',
  analyzedAt: null,
  hasEvaluation: true,
  matchScore: 87,
  primaryPhotoUrl: '/api/photo',
  explainability: {
    positiveChips: ['Life goals'],
    reasonShort: 'Aligned',
  },
  recommendation: {
    explainability: {
      positiveChips: ['Life goals'],
      reasonShort: 'Aligned',
    },
    primaryTakeaway: '',
    suggestedNextAction: 'Next',
  },
  whyTldr: 'You both want kids and deep talks.',
  suggestedOpener: 'Into hiking too — favorite trail?',
  yourAction: null,
} satisfies MeMatchItemDto;

describe('MatchBrowseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders photo-first region, collapsed why, and like/pass', () => {
    render(
      <ul>
        <MatchBrowseCard
          match={match}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId('match-browse-photo-region').className).toMatch(
      /h-\[70vh\]/,
    );
    expect(screen.getByTestId('match-browse-oneliner').textContent).toBe(
      'You both want kids and deep talks.',
    );
    expect(screen.getByTestId('match-why-toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(screen.getByTestId('match-browse-like')).toBeTruthy();
    expect(screen.getByTestId('match-browse-pass')).toBeTruthy();
  });

  it('expands why and emits analytics with explanation_expanded true', () => {
    render(
      <ul>
        <MatchBrowseCard
          match={match}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    const toggle = screen.getByTestId('match-why-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByTestId('match-why-panel').hasAttribute('hidden')).toBe(
      true,
    );

    toggle.focus();
    fireEvent.keyDown(toggle, { key: 'Enter', code: 'Enter' });
    // Native button activates via click; simulate activation path used by AT/keyboard
    fireEvent.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('match-why-panel').hasAttribute('hidden')).toBe(
      false,
    );
    expect(screen.getByTestId('match-browse-photo-region').className).toMatch(
      /h-\[40vh\]/,
    );
    expect(emitProductLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'match.card_viewed',
        meta: expect.objectContaining({
          event: 'match.card_viewed',
          matchProfileId: 'prof-1',
          explanation_expanded: true,
        }),
      }),
    );
  });

  it('calls likeMatch on Like', async () => {
    likeMatch.mockResolvedValue({
      id: 'a1',
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'prof-1',
      action: 'LIKE',
      createdAt: '2026-01-01T00:00:00.000Z',
      mutualMatch: false,
      conversationId: null,
    });

    render(
      <ul>
        <MatchBrowseCard
          match={match}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    fireEvent.click(screen.getByTestId('match-browse-like'));
    await vi.waitFor(() => {
      expect(likeMatch).toHaveBeenCalledWith('prof-1');
    });
  });

  it('shows opener for HIGH with suggestedOpener', () => {
    render(
      <ul>
        <MatchBrowseCard
          match={match}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );
    expect(screen.getByTestId('match-opener-section')).toBeTruthy();
    expect(screen.getByTestId('match-opener-text').textContent).toMatch(
      /hiking/i,
    );
  });

  it('hides opener for GOOD tier even if suggestedOpener set', () => {
    render(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            matchScore: 75,
            priorityScore: 75,
            priorityTier: 'GOOD',
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );
    expect(screen.queryByTestId('match-opener-section')).toBeNull();
  });

  it('hides opener when HIGH but suggestedOpener missing', () => {
    render(
      <ul>
        <MatchBrowseCard
          match={{ ...match, suggestedOpener: null }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );
    expect(screen.queryByTestId('match-opener-section')).toBeNull();
  });

  it('Like & use opener saves draft, logs, and likes', async () => {
    sessionStorage.clear();
    likeMatch.mockResolvedValue({
      id: 'a1',
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'prof-1',
      action: 'LIKE',
      createdAt: '2026-01-01T00:00:00.000Z',
      mutualMatch: false,
      conversationId: null,
    });

    render(
      <ul>
        <MatchBrowseCard
          match={match}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    fireEvent.click(screen.getByTestId('match-opener-use'));
    await vi.waitFor(() => {
      expect(likeMatch).toHaveBeenCalledWith('prof-1');
    });
    const raw = sessionStorage.getItem('dating.openerDraft');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).opener).toMatch(/hiking/i);
    expect(emitProductLog).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          event: 'conversation.opener_used',
          matchProfileId: 'prof-1',
        }),
      }),
    );
    expect(postOpenerLifecycleBestEffort).toHaveBeenCalledWith(
      'prof-1',
      'used',
    );
  });

  it('Like & use opener works after PASS', async () => {
    sessionStorage.clear();
    likeMatch.mockResolvedValue({
      id: 'a1',
      actorUserId: 'u1',
      targetUserId: 'u2',
      targetProfileIdSnapshot: 'prof-1',
      action: 'LIKE',
      createdAt: '2026-01-01T00:00:00.000Z',
      mutualMatch: false,
      conversationId: null,
    });

    render(
      <ul>
        <MatchBrowseCard
          match={{ ...match, yourAction: 'PASS' }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    fireEvent.click(screen.getByTestId('match-opener-use'));
    await vi.waitFor(() => {
      expect(likeMatch).toHaveBeenCalledWith('prof-1');
    });
  });
});
