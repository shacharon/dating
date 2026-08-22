/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { enCopy } from '@/lib/i18n/en';
import type { MeMatchItemDto } from '@/lib/me-matches-api';

const { likeMatch, passMatch, undoMatchAction, fetchMatchAction, blockMatch, emitProductLog } = vi.hoisted(() => ({
  likeMatch: vi.fn(),
  passMatch: vi.fn(),
  undoMatchAction: vi.fn(),
  fetchMatchAction: vi.fn(),
  blockMatch: vi.fn(),
  emitProductLog: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    matches: {
      likeMatch,
      passMatch,
      undoMatchAction,
      fetchMatchAction,
      blockMatch,
    },
  },
}));

vi.mock('@/lib/me-matches-api', () => ({
  likeMatch,
  passMatch,
  undoMatchAction,
  fetchMatchAction,
  blockMatch,
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
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

function renderCard(ui: React.ReactElement) {
  return render(
    <QueryClientTestProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientTestProvider>,
  );
}

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
    primaryTakeaway: 'You both want kids and deep talks.',
    suggestedNextAction: 'Next',
  },
  teaser: {
    mode: 'first_chapter' as const,
    lines: ['Both night owls · she bakes on Saturdays · ask about Japan'],
    showScore: true,
    score: 87,
    askHint: 'ask about Japan',
  },
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
    renderCard(
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
    const hook = screen.getByTestId('match-browse-hook');
    expect(hook.textContent).toBe(
      'Both night owls · she bakes on Saturdays · ask about Japan',
    );
    expect(hook.className).toMatch(/line-clamp-3/);
    expect(screen.getByTestId('match-why-toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(screen.getByTestId('match-browse-like')).toBeTruthy();
    expect(screen.getByTestId('match-browse-pass')).toBeTruthy();
  });

  it('expands why and emits analytics with explanation_expanded true', () => {
    renderCard(
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
          teaser_mode: 'first_chapter',
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

    renderCard(
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

  it('keeps photo h-[70vh] with long hook and Why closed (no layout steal)', () => {
    const longHook = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            teaser: {
              mode: 'first_chapter',
              lines: [longHook],
              showScore: true,
              score: 87,
            },
          }}
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
    expect(screen.getByTestId('match-browse-hook').className).toMatch(
      /line-clamp-3/,
    );
    expect(screen.getByTestId('match-why-toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
  });

  it('keeps small corner score badge (not Mode B hero)', () => {
    renderCard(
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

    const badge = screen.getByTestId('match-browse-score-badge');
    expect(badge.textContent).toBe('87%');
    expect(badge.className).toMatch(/end-3/);
    expect(badge.className).toMatch(/top-3/);
    expect(badge.className).toMatch(/text-xs/);
    expect(badge.className).not.toMatch(/text-4xl|text-5xl|text-6xl/);
  });

  it('hides score badge when teaser.showScore is false', () => {
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            teaser: { ...match.teaser!, showScore: false },
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.queryByTestId('match-browse-score-badge')).toBeNull();
  });

  it('hook uses dark-mode text token; card exposes teaser mode', () => {
    renderCard(
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

    expect(screen.getByTestId('match-browse-hook').className).toMatch(
      /dark:text-zinc-300/,
    );
    expect(screen.getByTestId('match-browse-card').getAttribute('data-teaser-mode')).toBe(
      'first_chapter',
    );
  });

  it('Mode B shows score hero + claim, hides corner badge', () => {
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            matchScore: 92,
            teaser: {
              mode: 'ready_again',
              lines: [],
              claim: 'Both want something serious — kids already clear',
              showScore: true,
              score: 92,
            },
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId('match-browse-card').getAttribute('data-teaser-mode')).toBe(
      'ready_again',
    );
    expect(screen.queryByTestId('match-browse-score-badge')).toBeNull();
    expect(screen.queryByTestId('match-browse-hook')).toBeNull();
    expect(screen.queryByTestId('match-browse-mode-c-teaser')).toBeNull();
    const hero = screen.getByTestId('match-browse-score-hero');
    expect(hero.textContent).toBe('92%');
    expect(hero.className).toMatch(/text-4xl/);
    expect(hero.getAttribute('aria-label')).toBe('Match score 92 percent');
    expect(screen.getByTestId('match-browse-claim').textContent).toBe(
      '“Both want something serious — kids already clear”',
    );
    // Builder contract: Mode B claim ≤12 words (UI clamp is safety only).
    expect(
      'Both want something serious — kids already clear'
        .split(/\s+/)
        .filter(Boolean).length,
    ).toBeLessThanOrEqual(12);
    expect(screen.getByTestId('match-browse-mode-b-sublabel').textContent).toBe(
      'Why this is worth your time',
    );
    expect(screen.getByTestId('match-why-toggle').textContent).toContain(
      'See the full why',
    );
    expect(screen.getByTestId('match-why-toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(screen.getByTestId('match-browse-like')).toBeTruthy();
    expect(screen.getByTestId('match-browse-photo-region').className).toMatch(
      /h-\[70vh\]/,
    );
  });

  it('Mode B empty claim uses i18n fallback; emits ready_again analytics', () => {
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            matchScore: 88,
            teaser: {
              mode: 'ready_again',
              lines: [],
              showScore: true,
              score: 88,
            },
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId('match-browse-claim').textContent).toBe(
      '“Strong life-goal fit — open for details”',
    );
    fireEvent.click(screen.getByTestId('match-why-toggle'));
    expect(emitProductLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'match.card_viewed',
        meta: expect.objectContaining({
          teaser_mode: 'ready_again',
          explanation_expanded: true,
        }),
      }),
    );
  });

  it('Mode B omits score hero when matchScore is null', () => {
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            matchScore: null,
            teaser: {
              mode: 'ready_again',
              lines: [],
              claim: 'Kids timeline aligned',
              showScore: true,
              score: null,
            },
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.queryByTestId('match-browse-score-hero')).toBeNull();
    expect(screen.getByTestId('match-browse-claim').textContent).toContain(
      'Kids timeline aligned',
    );
  });

  it('Mode B hides score hero when teaser.showScore is false', () => {
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            matchScore: 92,
            teaser: {
              mode: 'ready_again',
              lines: [],
              claim: 'Both want something serious',
              showScore: false,
              score: 92,
            },
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.queryByTestId('match-browse-score-hero')).toBeNull();
    expect(screen.getByTestId('match-browse-claim')).toBeTruthy();
  });

  it('Mode A does not render Mode B teaser block', () => {
    renderCard(
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

    expect(screen.queryByTestId('match-browse-mode-b-teaser')).toBeNull();
    expect(screen.queryByTestId('match-browse-mode-c-teaser')).toBeNull();
    expect(screen.queryByTestId('match-browse-score-hero')).toBeNull();
    expect(screen.queryByTestId('match-browse-claim')).toBeNull();
    expect(screen.getByTestId('match-browse-hook')).toBeTruthy();
    expect(screen.getByTestId('match-browse-score-badge')).toBeTruthy();
  });

  it('Mode C shows hybrid lines, hides corner badge and Mode B hero', () => {
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            matchScore: 88,
            teaser: {
              mode: 'new_chapter',
              lines: [
                '88% · both want a real partnership',
                'Kids situation aligned · same city · ask about her travel',
              ],
              showScore: true,
              score: 88,
            },
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId('match-browse-card').getAttribute('data-teaser-mode')).toBe(
      'new_chapter',
    );
    expect(screen.queryByTestId('match-browse-score-badge')).toBeNull();
    expect(screen.queryByTestId('match-browse-score-hero')).toBeNull();
    expect(screen.queryByTestId('match-browse-mode-b-teaser')).toBeNull();
    expect(screen.queryByTestId('match-browse-hook')).toBeNull();
    expect(screen.queryByTestId('match-browse-claim')).toBeNull();
    const teaser = screen.getByTestId('match-browse-mode-c-teaser');
    expect(teaser.className).toMatch(/text-start/);
    expect(teaser.className).not.toMatch(/text-center/);
    const line1 = screen.getByTestId('match-browse-hybrid-line1');
    expect(line1.textContent).toBe('88% · both want a real partnership');
    expect(line1.className).toMatch(/tabular-nums/);
    expect(line1.className).toMatch(/break-words/);
    expect(line1.className).toMatch(/line-clamp-2/);
    expect(line1.className).toMatch(/text-zinc-900/);
    expect(line1.className).toMatch(/dark:text-zinc-50/);
    const line2 = screen.getByTestId('match-browse-hybrid-line2');
    expect(line2.textContent).toBe(
      'Kids situation aligned · same city · ask about her travel',
    );
    expect(line2.className).toMatch(/break-words/);
    expect(line2.className).toMatch(/line-clamp-2/);
    expect(screen.getByTestId('match-browse-mode-c-section-label').textContent).toBe(
      'What lines up',
    );
    expect(screen.getByTestId('match-why-toggle').textContent).toContain('Full why');
    expect(screen.getByTestId('match-why-toggle').getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(screen.getByTestId('match-browse-like')).toBeTruthy();
    expect(screen.getByTestId('match-browse-photo-region').className).toMatch(
      /h-\[70vh\]/,
    );
  });

  it('Mode C empty lines uses i18n fallback; emits new_chapter analytics', () => {
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            matchScore: 88,
            teaser: {
              mode: 'new_chapter',
              lines: [],
              showScore: true,
              score: 88,
            },
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId('match-browse-hybrid-line1').textContent).toBe(
      'Clear life-goal overlap — open to learn more',
    );
    expect(screen.queryByTestId('match-browse-hybrid-line2')).toBeNull();
    fireEvent.click(screen.getByTestId('match-why-toggle'));
    expect(emitProductLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'match.card_viewed',
        meta: expect.objectContaining({
          teaser_mode: 'new_chapter',
          explanation_expanded: true,
        }),
      }),
    );
  });

  it('Mode C one-line teaser does not invent line2', () => {
    renderCard(
      <ul>
        <MatchBrowseCard
          match={{
            ...match,
            matchScore: 88,
            teaser: {
              mode: 'new_chapter',
              lines: ['88% · both want a real partnership'],
              showScore: true,
              score: 88,
            },
          }}
          index={0}
          locale="en"
          listCopy={enCopy.matches.list}
          detailCopy={enCopy.matches.detail}
          onMutualMatch={vi.fn()}
        />
      </ul>,
    );

    expect(screen.getByTestId('match-browse-hybrid-line1')).toBeTruthy();
    expect(screen.queryByTestId('match-browse-hybrid-line2')).toBeNull();
  });
});
