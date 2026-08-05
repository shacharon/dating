'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchMyMatches,
  type MeMatchItemDto,
  type MeMatchesListDto,
} from '@/lib/me-matches-api';

const PAGE_LIMIT = 20;
/** Poll while ranks rebuild after empty list (soft ceiling). */
const LIST_BUILDING_POLL_MS = 3000;
const LIST_BUILDING_MAX_POLLS = 4;

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
      const incoming = dto.matches ?? [];
      if (incoming.length > 0) {
        setMatches(incoming);
      } else if (!dto.listBuilding) {
        setMatches([]);
      }
      // listBuilding + empty: keep prior cards visible while ranks rebuild
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

  // While ranks rebuild, poll a few times instead of flashing the launch empty state.
  useEffect(() => {
    if (!data || data.status !== 'ready' || !data.listBuilding) return;
    if (matches.length > 0) return;
    let cancelled = false;
    let polls = 0;
    const tick = async () => {
      if (cancelled || polls >= LIST_BUILDING_MAX_POLLS) return;
      polls += 1;
      try {
        const dto = await fetchMyMatches({ limit: PAGE_LIMIT });
        if (cancelled) return;
        if (dto.status !== 'ready') return;
        setData(dto);
        if ((dto.matches?.length ?? 0) > 0) {
          setMatches(dto.matches ?? []);
          setNextCursor(dto.nextCursor ?? null);
          setHasMore(Boolean(dto.hasMore));
          return;
        }
        if (!dto.listBuilding || polls >= LIST_BUILDING_MAX_POLLS) {
          setMatches([]);
        }
      } catch {
        // keep building / prior error path
      }
      if (!cancelled && polls < LIST_BUILDING_MAX_POLLS) {
        window.setTimeout(() => void tick(), LIST_BUILDING_POLL_MS);
      }
    };
    const id = window.setTimeout(() => void tick(), LIST_BUILDING_POLL_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [data, matches.length]);

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
