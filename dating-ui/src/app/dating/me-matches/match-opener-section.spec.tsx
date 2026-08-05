/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { enCopy } from '@/lib/i18n/en';
import type { MeMatchItemDto } from '@/lib/me-matches-api';
import { MatchOpenerSection } from './match-opener-section';

const { emitProductLog, postOpenerLifecycleBestEffort } = vi.hoisted(() => ({
  emitProductLog: vi.fn(),
  postOpenerLifecycleBestEffort: vi.fn(),
}));

vi.mock('@/lib/observability/product-logger', () => ({
  emitProductLog,
}));

vi.mock('@/lib/me-matches-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/me-matches-api')>();
  return {
    ...actual,
    postOpenerLifecycleBestEffort,
  };
});

const baseMatch = {
  id: 'prof-1',
  nickname: 'Sara',
  gender: 'FEMALE',
  ageYears: 32,
  locationLabel: 'Tel Aviv',
  analyzedAt: null,
  hasEvaluation: true,
  matchScore: 92,
  priorityScore: 92,
  priorityTier: 'HIGH' as const,
  primaryPhotoUrl: null,
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
  suggestedOpener: 'Into hiking too — trail lately?',
  yourAction: null,
} satisfies MeMatchItemDto;

describe('MatchOpenerSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders opener and Like & use CTA', () => {
    const onLikeAndUse = vi.fn();
    render(
      <MatchOpenerSection
        match={baseMatch}
        browse={enCopy.matches.list.browse}
        currentAction={null}
        actionLoading={false}
        onLikeAndUse={onLikeAndUse}
      />,
    );
    expect(screen.getByTestId('match-opener-text').textContent).toMatch(
      /hiking/i,
    );
    fireEvent.click(screen.getByTestId('match-opener-use'));
    expect(onLikeAndUse).toHaveBeenCalledTimes(1);
    expect(emitProductLog).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({
          event: 'conversation.opener_displayed',
        }),
      }),
    );
    expect(postOpenerLifecycleBestEffort).toHaveBeenCalledWith(
      'prof-1',
      'displayed',
    );
  });

  it('shows waiting state when already liked', () => {
    render(
      <MatchOpenerSection
        match={baseMatch}
        browse={enCopy.matches.list.browse}
        currentAction="LIKE"
        actionLoading={false}
        onLikeAndUse={vi.fn()}
      />,
    );
    expect(screen.getByTestId('match-opener-waiting')).toBeTruthy();
    expect(screen.queryByTestId('match-opener-use')).toBeNull();
  });

  it('renders nothing when opener empty', () => {
    const { container } = render(
      <MatchOpenerSection
        match={{ ...baseMatch, suggestedOpener: null }}
        browse={enCopy.matches.list.browse}
        currentAction={null}
        actionLoading={false}
        onLikeAndUse={vi.fn()}
      />,
    );
    expect(container.querySelector('[data-testid="match-opener-section"]')).toBeNull();
  });
});
