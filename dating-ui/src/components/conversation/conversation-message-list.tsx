'use client';

import { useEffect, type RefObject } from 'react';
import type { MessageDto } from '@/lib/api/conversations-api';
import type { AppCopySchema, AppLocale } from '@/lib/i18n/types';
import { ConversationMessageBubble } from '@/components/conversation/conversation-message-bubble';

/** Scroll a message list container to its bottom (send / initial load). */
export function scrollListToBottom(listEl: HTMLDivElement | null) {
  if (!listEl) return;
  if (typeof listEl.scrollTo === 'function') {
    listEl.scrollTo({ top: listEl.scrollHeight, behavior: 'auto' });
  } else {
    listEl.scrollTop = listEl.scrollHeight;
  }
}

function isNearBottom(el: HTMLDivElement, thresholdPx = 80): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx;
}

type Props = {
  messages: MessageDto[];
  messagesLoading: boolean;
  messagesError: string | null;
  hasMore: boolean;
  loadingEarlier: boolean;
  loadEarlier: () => Promise<void>;
  socketReconnecting: boolean;
  showReconnecting: boolean;
  listRef: RefObject<HTMLDivElement | null>;
  initialScrollDone: boolean;
  currentUserId: string | undefined;
  detailCopy: AppCopySchema['conversations']['detail'];
  formatCopy: AppCopySchema['conversations']['format'];
  locale: AppLocale;
  loadingLabel: string;
};

/**
 * Scrollable message thread: reconnect banner, load-earlier, bubbles, empty/error.
 * Owns auto-scroll effects for the conversation detail page.
 */
export function ConversationMessageList({
  messages,
  messagesLoading,
  messagesError,
  hasMore,
  loadingEarlier,
  loadEarlier,
  socketReconnecting,
  showReconnecting,
  listRef,
  initialScrollDone,
  currentUserId,
  detailCopy,
  formatCopy,
  locale,
  loadingLabel,
}: Props) {
  useEffect(() => {
    if (messagesLoading || initialScrollDone) return;
    if (messages.length === 0) return;
    scrollListToBottom(listRef.current);
  }, [messagesLoading, messages.length, initialScrollDone, listRef]);

  useEffect(() => {
    if (messages.length === 0) return;
    const listEl = listRef.current;
    if (listEl && isNearBottom(listEl)) {
      requestAnimationFrame(() => scrollListToBottom(listEl));
    }
  }, [messages, listRef]);

  return (
    <>
      {showReconnecting && socketReconnecting && (
        <p
          role="status"
          data-testid="conversation-reconnecting"
          className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {detailCopy.reconnecting}
        </p>
      )}
      <div
        ref={listRef}
        className="flex max-h-96 flex-1 flex-col gap-3 overflow-y-auto p-4"
        data-testid="conversation-message-list"
      >
        {messagesLoading && (
          <p
            className="text-center text-sm text-zinc-400 dark:text-zinc-500"
            role="status"
            data-testid="conversation-messages-loading"
          >
            {detailCopy.loadingMessages}
          </p>
        )}

        {!messagesLoading && messagesError && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
            data-testid="conversation-messages-error"
          >
            {messagesError === 'Failed to load messages'
              ? detailCopy.loadMessagesFailed
              : messagesError}
          </div>
        )}

        {!messagesLoading && hasMore && (
          <button
            type="button"
            onClick={() => void loadEarlier()}
            disabled={loadingEarlier}
            className="mx-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            data-testid="conversation-load-earlier"
          >
            {loadingEarlier ? loadingLabel : detailCopy.loadEarlier}
          </button>
        )}

        {!messagesLoading && messages.length === 0 && !messagesError && (
          <p
            className="text-center text-sm text-zinc-500 dark:text-zinc-400"
            data-testid="conversation-messages-empty"
          >
            {detailCopy.emptyMessages}
          </p>
        )}

        {messages.map((msg) => (
          <ConversationMessageBubble
            key={msg.id}
            message={msg}
            isMine={msg.senderId === currentUserId}
            formatCopy={formatCopy}
            locale={locale}
          />
        ))}
      </div>
    </>
  );
}
