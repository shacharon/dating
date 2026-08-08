'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useInfiniteQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { fetchMyMatches } from '@/lib/me-matches-api';
import { mapMeMatchesListToViewModel } from '@/lib/matches/map-me-match-to-view-model';
import type {
  MatchListItemVM,
  MatchListPageVM,
} from '@/lib/matches/match-view-models';
import { queryKeys } from '@/lib/query-keys';

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

function dedupeMatchesById(items: MatchListItemVM[]): MatchListItemVM[] {
  const seen = new Set<string>();
  const out: MatchListItemVM[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

function resolveListEnvelope(
  pages: MatchListPageVM[] | undefined,
): MatchListPageVM | null {
  if (!pages?.length) return null;
  const ready = pages.find((p) => p.status === 'ready');
  return ready ?? pages[0] ?? null;
}

export function useInfiniteMatches(
  loadFailedMessage: string,
): UseInfiniteMatchesResult {
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const queryClient = useQueryClient();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const {
    data,
    error: queryError,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.me.matches.list,
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const dto = await fetchMyMatches({
        cursor: pageParam,
        limit: PAGE_LIMIT,
      });
      return mapMeMatchesListToViewModel(dto);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: MatchListPageVM) =>
      last.status === 'ready' && last.hasMore && last.nextCursor
        ? last.nextCursor
        : undefined,
  });

  const firstPage = data?.pages[0];

  useEffect(() => {
    if (!firstPage || firstPage.status !== 'not_ready') return;
    if (firstPage.reason === 'no_photo') return;
    if (firstPage.reason === 'no_profile') {
      routerRef.current.replace('/onboarding');
      return;
    }
    routerRef.current.replace('/profile?tab=analysis');
  }, [firstPage]);

  const listData = resolveListEnvelope(data?.pages);
  const matches =
    listData?.status === 'ready'
      ? dedupeMatchesById(
          (data?.pages ?? []).flatMap((page) =>
            page.status === 'ready' ? page.matches : [],
          ),
        )
      : [];

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.me.matches.list,
    });
  }, [queryClient]);

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

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? loadFailedMessage
        : null;

  return {
    data: listData,
    matches,
    loading: isPending,
    loadingMore: isFetchingNextPage,
    error,
    hasMore: Boolean(hasNextPage),
    loadMore,
    reload,
    sentinelRef,
  };
}
