/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useInfiniteMatches } from './use-infinite-matches';
import { queryKeys } from '@/lib/query-keys';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyMatches, replaceMock } = vi.hoisted(() => ({
  fetchMyMatches: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('@/lib/me-matches-api', () => ({
  fetchMyMatches,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(
    _cb: IntersectionObserverCallback,
    _opts?: IntersectionObserverInit,
  ) {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

const baseItem = {
  nickname: 'Ada',
  gender: 'FEMALE' as const,
  ageYears: 30,
  locationLabel: 'Tel Aviv',
  analyzedAt: null,
  hasEvaluation: true,
  matchScore: 90,
  priorityTier: 'HIGH' as const,
  explainability: {
    positiveChips: ['Depth'],
    reasonShort: 'Aligned',
  },
  recommendation: null,
  yourAction: null,
};

function renderInfinite(client = createTestQueryClient()) {
  return {
    client,
    ...renderHook(() => useInfiniteMatches('Load failed'), {
      wrapper: ({ children }) => (
        <QueryClientTestProvider client={client}>{children}</QueryClientTestProvider>
      ),
    }),
  };
}

describe('useInfiniteMatches (RQ)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads first ready page into matches', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [{ ...baseItem, id: 'prof-1' }],
      nextCursor: null,
      hasMore: false,
    });

    const { result } = renderInfinite();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.data?.status).toBe('ready');
    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0]?.id).toBe('prof-1');
    expect(result.current.hasMore).toBe(false);
    expect(fetchMyMatches).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 20,
    });
  });

  it('fetches next page with cursor and appends matches', async () => {
    fetchMyMatches
      .mockResolvedValueOnce({
        status: 'ready',
        matches: [{ ...baseItem, id: 'prof-1' }],
        nextCursor: 'cursor-2',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        status: 'ready',
        matches: [{ ...baseItem, id: 'prof-2', nickname: 'Bea' }],
        nextCursor: null,
        hasMore: false,
      });

    const { result } = renderInfinite();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.matches.map((m) => m.id)).toEqual([
        'prof-1',
        'prof-2',
      ]);
      expect(result.current.hasMore).toBe(false);
    });

    expect(fetchMyMatches).toHaveBeenNthCalledWith(2, {
      cursor: 'cursor-2',
      limit: 20,
    });
  });

  it('dedupes match ids across pages', async () => {
    fetchMyMatches
      .mockResolvedValueOnce({
        status: 'ready',
        matches: [{ ...baseItem, id: 'prof-1' }],
        nextCursor: 'cursor-2',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        status: 'ready',
        matches: [
          { ...baseItem, id: 'prof-1' },
          { ...baseItem, id: 'prof-2', nickname: 'Bea' },
        ],
        nextCursor: null,
        hasMore: false,
      });

    const { result } = renderInfinite();

    await waitFor(() => {
      expect(result.current.hasMore).toBe(true);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.matches.map((m) => m.id)).toEqual([
        'prof-1',
        'prof-2',
      ]);
    });
  });

  it('keeps no_photo gate on page without redirect', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'not_ready',
      reason: 'no_photo',
    });

    const { result } = renderInfinite();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({
      status: 'not_ready',
      reason: 'no_photo',
      nextCursor: null,
      hasMore: false,
    });
    expect(result.current.matches).toEqual([]);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to onboarding when not_ready no_profile', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'not_ready',
      reason: 'no_profile',
    });

    renderInfinite();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/onboarding');
    });
  });

  it('redirects to analysis when not_ready not_analyzed', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'not_ready',
      reason: 'not_analyzed',
    });

    renderInfinite();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/profile?tab=analysis');
    });
  });

  it('surfaces fetch errors', async () => {
    fetchMyMatches.mockRejectedValue(new Error('boom'));

    const { result } = renderInfinite();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('boom');
    expect(result.current.matches).toEqual([]);
  });

  it('reload invalidates the matches list query key', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [],
      nextCursor: null,
      hasMore: false,
    });

    const { result, client } = renderInfinite();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.reload();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.me.matches.list,
    });
  });
});
