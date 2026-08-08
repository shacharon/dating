/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInfiniteMatches } from './use-infinite-matches';
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
  constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

function renderInfinite() {
  return renderHook(() => useInfiniteMatches('Load failed'), {
    wrapper: ({ children }) => (
      <QueryClientTestProvider client={createTestQueryClient()}>
        {children}
      </QueryClientTestProvider>
    ),
  });
}

describe('useInfiniteMatches (RQ smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads first ready page into matches', async () => {
    fetchMyMatches.mockResolvedValue({
      status: 'ready',
      matches: [
        {
          id: 'prof-1',
          nickname: 'Ada',
          gender: 'FEMALE',
          ageYears: 30,
          locationLabel: 'Tel Aviv',
          analyzedAt: null,
          hasEvaluation: true,
          matchScore: 90,
          priorityTier: 'HIGH',
          explainability: {
            positiveChips: ['Depth'],
            reasonShort: 'Aligned',
          },
          recommendation: null,
          yourAction: null,
        },
      ],
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
});
