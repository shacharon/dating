/** @vitest-environment jsdom */
import {
  describe,
  expect,
  it,
  vi,
  beforeEach,
  afterEach,
  type ReactNode,
} from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MatchCompatibilityBreakdown } from './match-compatibility-breakdown';
import type { CompatibilityBreakdownDto } from '@/lib/me-matches-api';
import { enCopy } from '@/lib/i18n/en';

const { emitProductLog } = vi.hoisted(() => ({
  emitProductLog: vi.fn(),
}));

vi.mock('@/lib/observability/product-logger', () => ({
  emitProductLog,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const breakdown: CompatibilityBreakdownDto = {
  finalScore: 87,
  values: {
    score: 82,
    signals: [
      {
        key: 'traditionalism',
        label: 'Shared values',
        match: 'high',
        yourBand: 'High',
        theirBand: 'High',
      },
    ],
  },
  personality: {
    score: 75,
    signals: [
      {
        key: 'emotionalDepth',
        label: 'Emotional depth',
        match: 'high',
        yourBand: 'High',
        theirBand: 'High',
      },
    ],
  },
  interests: {
    score: 60,
    shared: ['Hiking', 'Cooking'],
    sharedCount: 2,
  },
  challenges: {
    areas: [
      {
        id: 'emotional_depth_gap',
        label: 'Emotional depth gap',
        note: 'Different depth preferences.',
      },
    ],
  },
};

describe('MatchCompatibilityBreakdown', () => {
  beforeEach(() => {
    emitProductLog.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('stays collapsed by default and expands with sections', () => {
    const { getByTestId } = render(
      <MatchCompatibilityBreakdown
        candidateProfileId="cand-1"
        matchScore={87}
        breakdown={breakdown}
        copy={enCopy.matches.detail.breakdown}
      />,
    );

    expect(getByTestId('match-breakdown-toggle').textContent).toContain(
      'How we calculated this',
    );
    expect(getByTestId('match-breakdown-panel').hidden).toBe(true);

    fireEvent.click(getByTestId('match-breakdown-toggle'));

    expect(getByTestId('match-breakdown-panel').hidden).toBe(false);
    expect(getByTestId('match-breakdown-values')).toBeTruthy();
    expect(getByTestId('match-breakdown-personality')).toBeTruthy();
    expect(getByTestId('match-breakdown-interests')).toBeTruthy();
    expect(getByTestId('match-breakdown-challenges')).toBeTruthy();
    expect(getByTestId('match-breakdown-learn-more').getAttribute('href')).toBe(
      '/about/algorithm?from=detail',
    );
    expect(emitProductLog).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'match_breakdown_expanded',
        meta: expect.objectContaining({
          candidateProfileId: 'cand-1',
          matchScore: 87,
          priorityTier: 'HIGH',
        }),
      }),
    );
  });

  it('hides personality/challenges when absent', () => {
    const slim: CompatibilityBreakdownDto = {
      finalScore: 70,
      values: { score: 50, signals: [] },
      interests: { score: 10, shared: [], sharedCount: 0 },
    };
    const { getByTestId, queryByTestId, getByText } = render(
      <MatchCompatibilityBreakdown
        candidateProfileId="cand-2"
        matchScore={70}
        breakdown={slim}
        copy={enCopy.matches.detail.breakdown}
      />,
    );
    fireEvent.click(getByTestId('match-breakdown-toggle'));
    expect(queryByTestId('match-breakdown-personality')).toBeNull();
    expect(queryByTestId('match-breakdown-challenges')).toBeNull();
    expect(getByText(/No shared interest tags yet/)).toBeTruthy();
  });
});
