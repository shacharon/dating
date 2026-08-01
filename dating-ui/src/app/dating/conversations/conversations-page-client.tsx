'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useConversationUnread } from '@/contexts/conversation-unread-context';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';
import {
  conversationPhotoSrc,
  fetchMyConversations,
  type ConversationListItemDto,
  type MessageDto,
} from '@/lib/conversations-api';
import { getActiveConversationId } from '@/lib/conversation-focus';
import { incrementUnreadForConversation } from '@/lib/conversation-list-unread';
import { useAppLocale } from '@/lib/i18n';
import { getRealtimeMode } from '@/lib/realtime-mode';
import {
  conversationPrimaryLabel,
  conversationSecondaryMeta,
  formatMatchedAt,
} from './conversation-display';

export default function ConversationsPage() {
  const { user } = useAuth();
  const { locale, copy } = useAppLocale();
  const listCopy = copy.conversations.list;
  const formatCopy = copy.conversations.format;
  const { reconcileFromList, refresh: refreshUnreadTotal } =
    useConversationUnread();
  const realtimeMode = getRealtimeMode();
  const [conversations, setConversations] = useState<ConversationListItemDto[]>(
    [],
  );
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFirstPage = useCallback(async () => {
    const dto = await fetchMyConversations();
    const list = dto.conversations ?? [];
    setConversations(list);
    setNextCursor(dto.nextCursor);
    setHasMore(dto.hasMore);
    reconcileFromList(list);
    void refreshUnreadTotal();
  }, [reconcileFromList, refreshUnreadTotal]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const dto = await fetchMyConversations({ cursor: nextCursor });
      const list = dto.conversations ?? [];
      setConversations((prev) => [...prev, ...list]);
      setNextCursor(dto.nextCursor);
      setHasMore(dto.hasMore);
      reconcileFromList(list);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, nextCursor, loadingMore, reconcileFromList]);

  const handleListMessageNew = useCallback(
    (msg: MessageDto) => {
      if (!user?.id || msg.senderId === user.id) {
        return;
      }
      if (msg.conversationId === getActiveConversationId()) {
        return;
      }
      setConversations((prev) =>
        incrementUnreadForConversation(prev, msg.conversationId),
      );
    },
    [user?.id],
  );

  useMessagingSocket({
    enabled: realtimeMode === 'ws',
    onMessageNew: handleListMessageNew,
    getLastMessageId: () => undefined,
    onMessagesMerged: () => {},
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadFirstPage()
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : listCopy.loadFailed,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadFirstPage, listCopy.loadFailed]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void loadFirstPage().catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadFirstPage]);

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
              onClick={() => void loadFirstPage().catch(() => undefined)}
            >
              {listCopy.tryAgain}
            </button>
          </div>
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
            <ul className="flex flex-col gap-3" data-testid="conversations-list">
              {conversations.map((item) => {
                const photoSrc = conversationPhotoSrc(item.otherUser.photoUrl);
                const secondary = conversationSecondaryMeta(item.otherUser);
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
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {conversationPrimaryLabel(item.otherUser)}
                          </p>
                          {secondary && (
                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                              {secondary}
                            </p>
                          )}
                          <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {formatMatchedAt(item.matchedAt, formatCopy, locale)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.unreadCount > 0 && (
                            <span
                              data-testid="conversation-unread-badge"
                              aria-label={listCopy.unreadAria(item.unreadCount)}
                              className="flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-emerald-500"
                            >
                              {item.unreadCount > 99 ? '99+' : item.unreadCount}
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
            {hasMore && (
              <button
                type="button"
                data-testid="conversations-load-more"
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                disabled={loadingMore}
                onClick={() => void loadMore().catch(() => undefined)}
              >
                {loadingMore ? copy.common.loading : 'Load more'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
