'use client';

import Link from 'next/link';
import { ConversationListFilters } from '@/components/conversation-list-filters';
import { InlineError } from '@/components/errors';
import { useConversationsListPage } from '@/hooks/use-conversations-list-page';
import { conversationPhotoSrc } from '@/lib/api/conversations-api';
import {
  conversationPrimaryLabel,
  formatConversationPreview,
  formatMatchedAt,
  formatMessageTime,
} from './conversation-display';

export default function ConversationsPage() {
  const {
    userId,
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
  } = useConversationsListPage();

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
          <InlineError onRetry={retry} retryLabel={listCopy.tryAgain}>
            {error}
          </InlineError>
        )}

        {!loading && !error && conversations.length === 0 && (
          <div
            className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"
            role="status"
            data-testid="conversations-empty"
          >
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {listCopy.emptyTitle}
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {listCopy.emptyBody}
            </p>
            <Link
              href="/dating/me-matches"
              className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
            >
              {listCopy.browseMatches}
            </Link>
          </div>
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
              <div
                className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"
                role="status"
                data-testid="conversations-filtered-empty"
              >
                <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                  {listCopy.filteredEmptyTitle}
                </p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  {listCopy.filteredEmptyBody}
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-3" data-testid="conversations-list">
                {visibleConversations.map((item) => {
                  const photoSrc = conversationPhotoSrc(item.otherUser.photoUrl);
                  const unread = item.unreadCount > 0;
                  const preview = formatConversationPreview(
                    item.lastMessage,
                    userId,
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
