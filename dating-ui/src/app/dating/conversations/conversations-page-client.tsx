'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { ConversationListFilters } from '@/components/conversation-list-filters';
import { EmptyStatePanel } from '@/components/empty-state-panel';
import { useAuth } from '@/contexts/auth-context';
import { useConversationUnread } from '@/contexts/conversation-unread-context';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import {
  conversationPhotoSrc,
  fetchMyConversations,
  type ConversationListItemDto,
  type ConversationListResponseDto,
  type MessageDto,
} from '@/lib/conversations-api';
import { getActiveConversationId } from '@/lib/conversation-focus';
import {
  CONVERSATION_LIST_CONTROLS_STORAGE_KEY,
  DEFAULT_CONVERSATION_LIST_CONTROLS,
  filterAndSortConversations,
  parseStoredConversationListControls,
  type ConversationFilterType,
  type ConversationSortBy,
} from '@/lib/conversation-list-controls';
import { applyIncomingMessageToConversationList } from '@/lib/conversation-list-unread';
import { useAppLocale } from '@/lib/i18n';
import { queryKeys } from '@/lib/query-keys';
import { getRealtimeMode } from '@/lib/realtime-mode';
import {
  conversationPrimaryLabel,
  formatConversationPreview,
  formatMatchedAt,
  formatMessageTime,
} from './conversation-display';

const SEARCH_DEBOUNCE_MS = 300;

export default function ConversationsPage() {
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

  // dataUpdatedAt changes on every fetch (even identical payloads) — clears optimistic bumps.
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

  const handleListMessageNew = useCallback(
    (msg: MessageDto) => {
      if (!user?.id) return;
      const isOwn = msg.senderId === user.id;
      const isActive = msg.conversationId === getActiveConversationId();
      const bumpUnread = !isOwn && !isActive;
      setOptimisticRows((prev) =>
        applyIncomingMessageToConversationList(prev ?? queryRows, msg, {
          bumpUnread,
        }),
      );
    },
    [user?.id, queryRows],
  );

  useMessagingSocket({
    enabled: realtimeMode === 'ws',
    onMessageNew: handleListMessageNew,
    getLastMessageId: () => undefined,
    onMessagesMerged: () => {},
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

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/dating/me-matches"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {listCopy.backToMatches}
          </Link>
        </nav>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {listCopy.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {listCopy.subtitle}
          </p>
        </header>

        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            {copy.common.loading}
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            {error}
            <button
              type="button"
              className="mt-3 block text-sm font-medium underline"
              onClick={() => {
                void refetch();
                void queryClient.invalidateQueries({
                  queryKey: queryKeys.me.conversations.list,
                });
              }}
            >
              {listCopy.tryAgain}
            </button>
          </div>
        )}

        {!loading && !error && conversations.length === 0 && (
          <EmptyStatePanel
            testId="conversations-empty"
            title={listCopy.emptyTitle}
            description={listCopy.emptyBody}
            primaryAction={{
              label: listCopy.browseMatches,
              href: '/dating/me-matches',
              testId: 'conversations-browse-matches',
            }}
          />
        )}

        {!loading && !error && conversations.length > 0 && (
          <>
            <ConversationListFilters
              searchQuery={searchQuery}
              filterType={filterType}
              sortBy={sortBy}
              onSearchQueryChange={setSearchQuery}
              onFilterTypeChange={setFilterType}
              onSortByChange={setSortBy}
              copy={filtersCopy}
            />

            {visibleConversations.length === 0 ? (
              <EmptyStatePanel
                testId="conversations-filtered-empty"
                title={listCopy.filteredEmptyTitle}
                description={listCopy.filteredEmptyBody}
                primaryAction={{
                  label: listCopy.clearFilters,
                  testId: 'conversations-clear-filters',
                  onClick: () => {
                    setSearchQuery(DEFAULT_CONVERSATION_LIST_CONTROLS.searchQuery);
                    setDebouncedSearch(
                      DEFAULT_CONVERSATION_LIST_CONTROLS.searchQuery,
                    );
                    setFilterType(DEFAULT_CONVERSATION_LIST_CONTROLS.filterType);
                    setSortBy(DEFAULT_CONVERSATION_LIST_CONTROLS.sortBy);
                  },
                }}
              />
            ) : (
              <ul className="flex flex-col gap-3" data-testid="conversations-list">
                {visibleConversations.map((item) => {
                  const photoSrc = conversationPhotoSrc(item.otherUser.photoUrl);
                  const unread = item.unreadCount > 0;
                  const preview = formatConversationPreview(
                    item.lastMessage,
                    user?.id,
                    listCopy,
                  );
                  const timestamp = item.lastMessage
                    ? formatMessageTime(
                        item.lastMessage.sentAt,
                        formatCopy,
                        locale,
                      )
                    : formatMatchedAt(item.matchedAt, formatCopy, locale);
                  return (
                    <li key={item.id}>
                      <Link
                        href={`/dating/conversations/${item.id}`}
                        className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                        data-testid="conversation-row"
                      >
                        <div className="flex items-center gap-4">
                          {photoSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoSrc}
                              alt=""
                              className="h-14 w-14 shrink-0 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800"
                            />
                          ) : (
                            <div
                              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                              aria-hidden
                            >
                              ?
                            </div>
                          )}
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p
                                className={`truncate text-sm text-zinc-900 dark:text-zinc-100 ${
                                  unread ? 'font-semibold' : 'font-medium'
                                }`}
                                data-testid="conversation-primary-label"
                              >
                                {conversationPrimaryLabel(item.otherUser)}
                              </p>
                              <p
                                className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500"
                                data-testid="conversation-list-time"
                              >
                                {timestamp}
                              </p>
                            </div>
                            <p
                              className="truncate text-xs text-zinc-500 dark:text-zinc-400"
                              data-testid="conversation-preview"
                            >
                              {preview}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {unread && (
                              <span
                                data-testid="conversation-unread-badge"
                                aria-label={listCopy.unreadAria(
                                  item.unreadCount,
                                )}
                                className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-emerald-500"
                              >
                                {item.unreadCount > 99
                                  ? '99+'
                                  : item.unreadCount}
                              </span>
                            )}
                            <span
                              className="text-zinc-300 dark:text-zinc-600"
                              aria-hidden
                            >
                              →
                            </span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {hasNextPage && (
              <button
                type="button"
                data-testid="conversations-load-more"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                disabled={isFetchingNextPage}
                onClick={loadMore}
              >
                {isFetchingNextPage ? copy.common.loading : listCopy.loadMore}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
