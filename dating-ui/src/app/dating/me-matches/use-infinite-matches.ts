'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchMyMatches,
  type MeMatchItemDto,
  type MeMatchesListDto,
} from '@/lib/me-matches-api';

const PAGE_LIMIT = 20;

export type UseInfiniteMatchesResult = {
  data: MeMatchesListDto | null;
  matches: MeMatchItemDto[];
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
  const [data, setData] = useState<MeMatchesListDto | null>(null);
  const [matches, setMatches] = useState<MeMatchItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleNotReadyRedirect = useCallback(
    (dto: MeMatchesListDto) => {
      if (dto.reason === 'no_profile') router.replace('/onboarding');
      else router.replace('/profile?tab=analysis');
    },
    [router],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dto = await fetchMyMatches({ limit: PAGE_LIMIT });
      if (dto.status === 'not_ready') {
        // Stay on Matches for photo gate — show an in-page empty state instead of a silent redirect.
        if (dto.reason === 'no_photo') {
          setData(dto);
          setMatches([]);
          setNextCursor(null);
          setHasMore(false);
          return;
        }
        handleNotReadyRedirect(dto);
        return;
      }
      setData(dto);
      setMatches(dto.matches ?? []);
      setNextCursor(dto.nextCursor ?? null);
      setHasMore(Boolean(dto.hasMore));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : loadFailedMessage);
    } finally {
      setLoading(false);
    }
  }, [handleNotReadyRedirect, loadFailedMessage]);

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
      if (dto.status !== 'ready') return;
      const incoming = dto.matches ?? [];
      setMatches((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const merged = [...prev];
        for (const m of incoming) {
          if (!seen.has(m.id)) merged.push(m);
        }
        return merged;
      });
      setNextCursor(dto.nextCursor ?? null);
      setHasMore(Boolean(dto.hasMore));
      setData((prev) =>
        prev
          ? {
              ...prev,
              ...dto,
              matches: undefined,
            }
          : dto,
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
