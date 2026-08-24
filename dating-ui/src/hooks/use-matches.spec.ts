/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { MeMatchesListDto } from '@/lib/api-types/matches';
import { queryKeys } from '@/lib/query/query-keys';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';
import {
  flattenReadyMatches,
  patchMatchYourActionInCache,
  useInfiniteMatches,
  type MatchesInfiniteData,
} from './use-matches';

const { fetchMyMatches } = vi.hoisted(() => ({
  fetchMyMatches: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    matches: {
      fetchMyMatches,
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

const readyPage = (
  matches: { id: string; yourAction?: 'LIKE' | 'PASS' | 'BLOCK' | null }[],
  opts?: { hasMore?: boolean; nextCursor?: string | null },
): MeMatchesListDto => ({
  status: 'ready',
  matches: matches.map((m) => ({
    id: m.id,
    nickname: null,
    gender: 'FEMALE',
    ageYears: 28,
    locationLabel: 'Tel Aviv',
    analyzedAt: '2026-01-01T00:00:00.000Z',
    hasEvaluation: true,
    matchScore: 80,
    explainability: null,
    recommendation: null,
    yourAction: m.yourAction ?? null,
  })),
  hasMore: opts?.hasMore ?? false,
  nextCursor: opts?.nextCursor ?? null,
});

function renderInfiniteMatches() {
  const client = createTestQueryClient();
  const view = renderHook(() => useInfiniteMatches('Load failed'), {
    wrapper: ({ children }) =>
      createElement(QueryClientTestProvider, { client }, children),
  });
  return { ...view, client };
}

describe('use-matches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the first page via useInfiniteQuery', async () => {
    fetchMyMatches.mockResolvedValueOnce(readyPage([{ id: 'm1' }]));

    const { result } = renderInfiniteMatches();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchMyMatches).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 20,
    });
    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].id).toBe('m1');
    expect(result.current.error).toBeNull();
  });

  it('does not throw on not_ready first page', async () => {
    const notReady: MeMatchesListDto = {
      status: 'not_ready',
      reason: 'no_photo',
      matches: [],
      hasMore: false,
      nextCursor: null,
    };
    fetchMyMatches.mockResolvedValueOnce(notReady);

    const { result } = renderInfiniteMatches();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data?.status).toBe('not_ready');
    expect(result.current.matches).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('dedupes matches when flattening multiple ready pages', () => {
    const pages = [
      readyPage([{ id: 'm1' }, { id: 'm2' }], {
        hasMore: true,
        nextCursor: 'c2',
      }),
      readyPage([{ id: 'm2' }, { id: 'm3' }]),
    ];

    expect(flattenReadyMatches(pages)).toEqual([
      expect.objectContaining({ id: 'm1' }),
      expect.objectContaining({ id: 'm2' }),
      expect.objectContaining({ id: 'm3' }),
    ]);
  });

  it('patchMatchYourActionInCache updates yourAction on a row', () => {
    const client = createTestQueryClient();
    const data: MatchesInfiniteData = {
      pageParams: [undefined],
      pages: [readyPage([{ id: 'm1', yourAction: null }])],
    };
    client.setQueryData(queryKeys.me.matches.list, data);

    patchMatchYourActionInCache(client, 'm1', 'LIKE');

    const updated = client.getQueryData<MatchesInfiniteData>(
      queryKeys.me.matches.list,
    );
    expect(updated?.pages[0].matches?.[0].yourAction).toBe('LIKE');
  });
});
