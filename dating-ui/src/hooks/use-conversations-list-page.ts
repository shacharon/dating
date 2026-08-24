'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { useConversationUnread } from '@/contexts/conversation-unread-context';
import { useConversationListRealtime } from '@/hooks/messaging/use-conversation-list-realtime';
import {
  fetchMyConversations,
  type ConversationListItemDto,
  type ConversationListResponseDto,
} from '@/lib/api/conversations-api';
import {
  CONVERSATION_LIST_CONTROLS_STORAGE_KEY,
  DEFAULT_CONVERSATION_LIST_CONTROLS,
  filterAndSortConversations,
  parseStoredConversationListControls,
  type ConversationFilterType,
  type ConversationSortBy,
} from '@/lib/messaging/conversation-list-controls';
import { useAppLocale } from '@/lib/i18n';
import { queryKeys } from '@/lib/query/query-keys';
import { getRealtimeMode } from '@/lib/platform/realtime-mode';

const SEARCH_DEBOUNCE_MS = 300;

/** Conversations list page model: RQ + filters + Story 01 list realtime. */
export function useConversationsListPage() {
  const { user } = useAuth();
  const { locale, copy } = useAppLocale();
  const listCopy = copy.conversations.list;
  const formatCopy = copy.conversations.format;
  const { reconcileFromList } = useConversationUnread();
  const queryClient = useQueryClient();
  const realtimeMode = getRealtimeMode();
  const [optimisticRows, setOptimisticRows] = useState<
    ConversationListItemDto[] | null
  >(null);

  const [searchQuery, setSearchQuery] = useState(
    DEFAULT_CONVERSATION_LIST_CONTROLS.searchQuery,
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    DEFAULT_CONVERSATION_LIST_CONTROLS.searchQuery,
  );
  const [filterType, setFilterType] = useState<ConversationFilterType>(
    DEFAULT_CONVERSATION_LIST_CONTROLS.filterType,
  );
  const [sortBy, setSortBy] = useState<ConversationSortBy>(
    DEFAULT_CONVERSATION_LIST_CONTROLS.sortBy,
  );
  const [controlsReady, setControlsReady] = useState(false);

  useEffect(() => {
    const stored = parseStoredConversationListControls(
      sessionStorage.getItem(CONVERSATION_LIST_CONTROLS_STORAGE_KEY),
    );
    if (stored) {
      setSearchQuery(stored.searchQuery);
      setDebouncedSearch(stored.searchQuery);
      setFilterType(stored.filterType);
      setSortBy(stored.sortBy);
    }
    setControlsReady(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!controlsReady) return;
    try {
      sessionStorage.setItem(
        CONVERSATION_LIST_CONTROLS_STORAGE_KEY,
        JSON.stringify({
          searchQuery,
          filterType,
          sortBy,
        }),
      );
    } catch {
      // ignore quota / private mode
    }
  }, [controlsReady, searchQuery, filterType, sortBy]);

  const {
    data,
    dataUpdatedAt,
    error: queryError,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: queryKeys.me.conversations.list,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchMyConversations({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: ConversationListResponseDto) =>
      last.hasMore && last.nextCursor ? last.nextCursor : undefined,
  });

  const queryRows = useMemo(
    () => data?.pages.flatMap((p) => p.conversations) ?? [],
    [data],
  );

  useEffect(() => {
    setOptimisticRows(null);
  }, [dataUpdatedAt]);

  const conversations = optimisticRows ?? queryRows;

  const visibleConversations = useMemo(
    () =>
      filterAndSortConversations(
        conversations,
        {
          searchQuery: debouncedSearch,
          filterType,
          sortBy,
        },
        { locale },
      ),
    [conversations, debouncedSearch, filterType, sortBy, locale],
  );

  useEffect(() => {
    if (!data?.pages.length) return;
    const lastPage = data.pages[data.pages.length - 1];
    if (lastPage) {
      reconcileFromList(lastPage.conversations ?? []);
    }
  }, [data, reconcileFromList]);

  const loadMore = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage().then((result) => {
      const pages = result.data?.pages;
      const last = pages?.[pages.length - 1];
      if (last) {
        reconcileFromList(last.conversations ?? []);
      }
    });
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, reconcileFromList]);

  useConversationListRealtime({
    enabled: realtimeMode === 'ws',
    sessionUserId: user?.id,
    queryRows,
    setOptimisticRows,
  });

  const loading = isPending;
  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? listCopy.loadFailed
        : null;

  const filtersCopy = {
    searchPlaceholder: listCopy.searchPlaceholder,
    searchClear: listCopy.searchClear,
    searchAria: listCopy.searchAria,
    filterLabel: listCopy.filterLabel,
    filterAria: listCopy.filterAria,
    filterAll: listCopy.filterAll,
    filterUnread: listCopy.filterUnread,
    filterRecent: listCopy.filterRecent,
    sortLabel: listCopy.sortLabel,
    sortAria: listCopy.sortAria,
    sortRecent: listCopy.sortRecent,
    sortAlphabetical: listCopy.sortAlphabetical,
  };

  const retry = useCallback(() => {
    void refetch();
    void queryClient.invalidateQueries({
      queryKey: queryKeys.me.conversations.list,
    });
  }, [refetch, queryClient]);

  return {
    userId: user?.id,
    locale,
    copy,
    listCopy,
    formatCopy,
    loading,
    error,
    conversations,
    visibleConversations,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    filtersCopy,
    loadMore,
    hasNextPage,
    isFetchingNextPage,
    retry,
  };
}
