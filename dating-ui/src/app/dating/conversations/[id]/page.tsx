'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useConversationUnread } from '@/contexts/conversation-unread-context';
import {
  fetchMyConversationById,
  type ConversationDetailDto,
} from '@/lib/conversations-api';
import { conversationPrimaryLabel } from '@/app/dating/conversations/conversation-display';
import { useAppLocale } from '@/lib/i18n';
import { setActiveConversationId } from '@/lib/conversation-focus';
import { useConversationMessages } from '@/hooks/use-conversation-messages';
import { useConversationActions } from '@/hooks/use-conversation-actions';
import { getRealtimeMode } from '@/lib/realtime-mode';
import { ConversationHeader } from '@/components/conversation/conversation-header';
import { ConversationMessageList } from '@/components/conversation/conversation-message-list';
import { ConversationMessageComposer } from '@/components/conversation/conversation-message-composer';
import { ConversationActions } from '@/components/conversation/conversation-actions';
import { ConversationModals } from '@/components/conversation/conversation-modals';

export default function ConversationDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { locale, copy } = useAppLocale();
  const detailCopy = copy.conversations.detail;
  const formatCopy = copy.conversations.format;
  const modCopy = copy.contentModeration;
  const { refresh: refreshNavUnread } = useConversationUnread();
  const id = typeof params.id === 'string' ? params.id : '';
  const realtimeMode = getRealtimeMode();

  const [data, setData] = useState<ConversationDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    sendMessage,
    sending,
    sendError,
    sendModerationDetails,
    clearSendError,
    hasMore,
    loadEarlier,
    loadingEarlier,
    socketReconnecting,
    listRef,
    initialScrollDone,
  } = useConversationMessages({
    conversationId: id,
    enabled: true,
    onRefreshUnread: refreshNavUnread,
  });

  const {
    unmatch,
    unmatching,
    unmatchError,
    clearUnmatchError,
  } = useConversationActions(id);

  useEffect(() => {
    if (!id) return;
    setActiveConversationId(id);
    return () => setActiveConversationId(null);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchMyConversationById(id)
      .then((dto) => {
        if (!cancelled) setData(dto);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : detailCopy.loadFailed,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, detailCopy.loadFailed]);

  const otherName = data ? conversationPrimaryLabel(data.otherUser) : '';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
        <nav className="text-sm">
          <Link
            href="/dating/conversations"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            data-testid="conversation-back-link"
          >
            {detailCopy.backToList}
          </Link>
        </nav>

        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            {copy.common.loading}
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
            data-testid="conversation-error"
          >
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <ConversationHeader
              data={data}
              formatCopy={formatCopy}
              locale={locale}
            />

            <section
              className="flex min-h-64 flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              aria-label={detailCopy.messagingAria}
              data-testid="conversation-messaging"
            >
              <ConversationMessageList
                messages={messages}
                messagesLoading={messagesLoading}
                messagesError={messagesError}
                hasMore={hasMore}
                loadingEarlier={loadingEarlier}
                loadEarlier={loadEarlier}
                socketReconnecting={socketReconnecting}
                showReconnecting={realtimeMode === 'ws'}
                listRef={listRef}
                initialScrollDone={initialScrollDone}
                currentUserId={user?.id}
                detailCopy={detailCopy}
                formatCopy={formatCopy}
                locale={locale}
                loadingLabel={copy.common.loading}
              />
              <ConversationMessageComposer
                detailCopy={detailCopy}
                modCopy={modCopy}
                sending={sending}
                sendError={sendError}
                sendModerationDetails={sendModerationDetails}
                clearSendError={clearSendError}
                sendMessage={sendMessage}
                listRef={listRef}
              />
            </section>

            <ConversationActions
              otherName={otherName}
              detailCopy={detailCopy}
              cancelLabel={copy.common.cancel}
              reportLabel={copy.reportUser.linkLabel}
              unmatching={unmatching}
              unmatchError={unmatchError}
              clearUnmatchError={clearUnmatchError}
              unmatch={unmatch}
              onReport={() => setReportOpen(true)}
            />
          </>
        )}
      </div>

      {data && id ? (
        <ConversationModals
          conversationId={id}
          subjectLabel={otherName}
          reportOpen={reportOpen}
          onCloseReport={() => setReportOpen(false)}
        />
      ) : null}
    </div>
  );
}
