'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { datingApi } from '@/lib/api-sdk';
import type {
  MatchActionDto,
  MatchActionStateDto,
  MeMatchItemDto,
  MeMatchesListDto,
} from '@/lib/api-types/matches';
import { queryKeys } from '@/lib/query-keys';

export const MATCHES_PAGE_LIMIT = 20;
export const MATCHES_LIST_STALE_TIME_MS = 300_000;

export type MatchYourAction = 'LIKE' | 'PASS' | 'BLOCK' | null;
export type MatchesInfiniteData = InfiniteData<
  MeMatchesListDto,
  string | undefined
>;

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

export function flattenReadyMatches(
  pages: MeMatchesListDto[],
): MeMatchItemDto[] {
  const seen = new Set<string>();
  const merged: MeMatchItemDto[] = [];
  for (const page of pages) {
    if (page.status !== 'ready') continue;
    for (const m of page.matches ?? []) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        merged.push(m);
      }
    }
  }
  return merged;
}

export function patchMatchYourActionInCache(
  queryClient: QueryClient,
  matchProfileId: string,
  yourAction: MatchYourAction,
): void {
  queryClient.setQueryData<MatchesInfiniteData>(
    queryKeys.me.matches.list,
    (old) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page) => {
          if (page.status !== 'ready' || !page.matches) return page;
          return {
            ...page,
            matches: page.matches.map((m) =>
              m.id === matchProfileId ? { ...m, yourAction } : m,
            ),
          };
        }),
      };
    },
  );
}

function snapshotMatchesCache(
  queryClient: QueryClient,
): MatchesInfiniteData | undefined {
  return queryClient.getQueryData(queryKeys.me.matches.list);
}

function mergeListData(pages: MeMatchesListDto[]): MeMatchesListDto | null {
  if (!pages.length) return null;
  const first = pages[0];
  const lastReady =
    [...pages].reverse().find((p) => p.status === 'ready') ?? first;
  if (first.status === 'not_ready') return first;
  return {
    ...first,
    ...lastReady,
    matches: undefined,
  };
}

export function useInfiniteMatches(
  loadFailedMessage: string,
): UseInfiniteMatchesResult {
  const router = useRouter();
  const observerRef = useRef<IntersectionObserver | null>(null);

  const {
    data,
    error: queryError,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.me.matches.list,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      datingApi.matches.fetchMyMatches({
        cursor: pageParam,
        limit: MATCHES_PAGE_LIMIT,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: MeMatchesListDto) =>
      last.status === 'ready' && last.hasMore && last.nextCursor
        ? last.nextCursor
        : undefined,
    staleTime: MATCHES_LIST_STALE_TIME_MS,
  });

  const pages = data?.pages ?? [];
  const firstPage = pages[0];

  const handleNotReadyRedirect = useCallback(
    (dto: MeMatchesListDto) => {
      if (dto.reason === 'no_profile') router.replace('/onboarding');
      else router.replace('/profile?tab=analysis');
    },
    [router],
  );

  useEffect(() => {
    if (!firstPage || firstPage.status !== 'not_ready') return;
    if (firstPage.reason === 'no_photo') return;
    handleNotReadyRedirect(firstPage);
  }, [firstPage, handleNotReadyRedirect]);

  const matches = useMemo(() => flattenReadyMatches(pages), [pages]);
  const listData = useMemo(() => mergeListData(pages), [pages]);

  const hasMore = useMemo(() => {
    const lastReady = [...pages].reverse().find((p) => p.status === 'ready');
    return Boolean(lastReady?.hasMore);
  }, [pages]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const reload = useCallback(async () => {
    await refetch();
  }, [refetch]);

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
    hasMore,
    loadMore,
    reload,
    sentinelRef,
  };
}

type MatchMutationContext = {
  previous: MatchesInfiniteData | undefined;
};

export function useLikeMatch(options?: {
  onMutualMatch?: (conversationId: string) => void;
}): UseMutationResult<MatchActionDto, Error, string, MatchMutationContext> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => datingApi.matches.likeMatch(matchId),
    onMutate: async (matchId) => {
      const previous = snapshotMatchesCache(queryClient);
      patchMatchYourActionInCache(queryClient, matchId, 'LIKE');
      return { previous };
    },
    onError: (_err, _matchId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.me.matches.list, context.previous);
      }
    },
    onSuccess: (result, matchId) => {
      patchMatchYourActionInCache(queryClient, matchId, 'LIKE');
      if (result.mutualMatch && result.conversationId) {
        options?.onMutualMatch?.(result.conversationId);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.me.conversations.list,
        });
        void queryClient.invalidateQueries({
          queryKey: queryKeys.me.conversations.unreadTotal,
        });
      }
    },
  });
}

export function usePassMatch(): UseMutationResult<
  { result: MatchActionDto; actionState: MatchActionStateDto },
  Error,
  string,
  MatchMutationContext
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      const result = await datingApi.matches.passMatch(matchId);
      const actionState = await datingApi.matches.fetchMatchAction(matchId);
      return { result, actionState };
    },
    onMutate: async (matchId) => {
      const previous = snapshotMatchesCache(queryClient);
      patchMatchYourActionInCache(queryClient, matchId, 'PASS');
      return { previous };
    },
    onError: (_err, _matchId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.me.matches.list, context.previous);
      }
    },
    onSuccess: ({ actionState }, matchId) => {
      patchMatchYourActionInCache(
        queryClient,
        matchId,
        actionState.action,
      );
    },
  });
}

export function useBlockMatch(): UseMutationResult<
  MatchActionDto,
  Error,
  string,
  MatchMutationContext
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => datingApi.matches.blockMatch(matchId),
    onMutate: async (matchId) => {
      const previous = snapshotMatchesCache(queryClient);
      patchMatchYourActionInCache(queryClient, matchId, 'BLOCK');
      return { previous };
    },
    onError: (_err, _matchId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.me.matches.list, context.previous);
      }
    },
    onSuccess: (_result, matchId) => {
      patchMatchYourActionInCache(queryClient, matchId, 'BLOCK');
    },
  });
}

export function useUndoMatchAction(): UseMutationResult<
  MatchActionStateDto,
  Error,
  string,
  MatchMutationContext
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (matchId: string) => {
      await datingApi.matches.undoMatchAction(matchId);
      return datingApi.matches.fetchMatchAction(matchId);
    },
    onMutate: async (matchId) => {
      const previous = snapshotMatchesCache(queryClient);
      patchMatchYourActionInCache(queryClient, matchId, null);
      return { previous };
    },
    onError: (_err, _matchId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.me.matches.list, context.previous);
      }
    },
    onSuccess: (actionState, matchId) => {
      patchMatchYourActionInCache(
        queryClient,
        matchId,
        actionState.action,
      );
    },
  });
}
