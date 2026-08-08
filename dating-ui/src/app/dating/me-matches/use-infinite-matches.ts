'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMyMatches } from '@/lib/me-matches-api';
import { mapMeMatchesListToViewModel } from '@/lib/matches/map-me-match-to-view-model';
import type {
  MatchListItemVM,
  MatchListPageVM,
} from '@/lib/matches/match-view-models';

const PAGE_LIMIT = 20;

export type UseInfiniteMatchesResult = {
  data: MatchListPageVM | null;
  matches: MatchListItemVM[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
  sentinelRef: (node: HTMLElement | null) => void;
};

export function useInfiniteMatches(
  loadFailedMessage: string,
): UseInfiniteMatchesResult {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [data, setData] = useState<MatchListPageVM | null>(null);
  const [matches, setMatches] = useState<MatchListItemVM[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = await fetchMyMatches({ limit: PAGE_LIMIT });
      const page = mapMeMatchesListToViewModel(dto);
      if (page.status === 'not_ready') {
        // Stay on Matches for photo gate — show an in-page empty state instead of a silent redirect.
        if (page.reason === 'no_photo') {
          setData(page);
          setMatches([]);
          setNextCursor(null);
          setHasMore(false);
          return;
        }
        if (page.reason === 'no_profile') routerRef.current.replace('/onboarding');
        else routerRef.current.replace('/profile?tab=analysis');
        return;
      }
      setData(page);
      setMatches(page.matches);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : loadFailedMessage);
    } finally {
      setLoading(false);
    }
  }, [loadFailedMessage]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const dto = await fetchMyMatches({
        cursor: nextCursor,
        limit: PAGE_LIMIT,
      });
      const page = mapMeMatchesListToViewModel(dto);
      if (page.status !== 'ready') return;
      const incoming = page.matches;
      setMatches((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const m of incoming) {
          if (!seen.has(m.id)) merged.push(m);
        }
        return merged;
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setData((prev) =>
        prev && prev.status === 'ready'
          ? {
              ...prev,
              ...page,
              matches: prev.matches,
            }
          : page,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : loadFailedMessage);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [hasMore, nextCursor, loadFailedMessage]);

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;
      if (typeof IntersectionObserver === 'undefined') return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            void loadMore();
          }
        },
        { rootMargin: '200px' },
      );
      observerRef.current.observe(node);
    },
    [loadMore],
  );

  return {
    data,
    matches,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    reload,
    sentinelRef,
  };
}
