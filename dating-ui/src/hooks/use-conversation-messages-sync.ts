'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { datingApi } from '@/lib/api-sdk';
import type { MessageDto } from '@/lib/api-types/conversations';
import {
  appendMessagesInCache,
  getLastPersistedMessageId,
} from '@/hooks/conversation-messages-cache';
import {
  useMessagingSocket,
  type MessagingConnectionStatus,
} from '@/hooks/use-messaging-socket';
import { getRealtimeMode } from '@/lib/platform/realtime-mode';

const POLL_INTERVAL_MS = 3000;
const MARK_READ_DEBOUNCE_MS = 15_000;

export type UseConversationMessagesSyncOptions = {
  conversationId: string;
  enabled?: boolean;
  isPending: boolean;
  messagesRef: React.RefObject<MessageDto[]>;
  onRefreshUnread?: () => void;
};

export type UseConversationMessagesSyncResult = {
  socketReconnecting: boolean;
  markAsRead: () => Promise<void>;
};

export function useConversationMessagesSync(
  options: UseConversationMessagesSyncOptions,
): UseConversationMessagesSyncResult {
  const {
    conversationId,
    enabled = true,
    isPending,
    messagesRef,
    onRefreshUnread,
  } = options;
  const queryClient = useQueryClient();
  const [socketReconnecting, setSocketReconnecting] = useState(false);

  const lastMarkReadAtRef = useRef(0);
  const realtimeMode = getRealtimeMode();

  useEffect(() => {
    lastMarkReadAtRef.current = 0;
    setSocketReconnecting(false);
  }, [conversationId]);

  const tryMarkRead = useCallback(async () => {
    if (!conversationId) return;
    try {
      await datingApi.conversations.markConversationAsRead(conversationId);
      lastMarkReadAtRef.current = Date.now();
      if (onRefreshUnread) {
        void onRefreshUnread();
      }
    } catch {
      // silent — read tracking must not block messaging
    }
  }, [conversationId, onRefreshUnread]);

  const mergeIncomingMessages = useCallback(
    (incoming: MessageDto[]) => {
      if (incoming.length === 0) return;
      appendMessagesInCache(queryClient, conversationId, incoming);
    },
    [queryClient, conversationId],
  );

  const handleMessageNew = useCallback(
    (msg: MessageDto) => mergeIncomingMessages([msg]),
    [mergeIncomingMessages],
  );

  const getLastMessageId = useCallback(
    () => getLastPersistedMessageId(messagesRef.current),
    [],
  );

  const handleSocketConnectionChange = useCallback(
    (status: MessagingConnectionStatus) => {
      setSocketReconnecting(status === 'reconnecting');
    },
    [],
  );

  useEffect(() => {
    if (!conversationId || isPending || !enabled) return;
    void tryMarkRead();
  }, [conversationId, isPending, enabled, tryMarkRead]);

  useEffect(() => {
    if (!conversationId || !enabled) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastMarkReadAtRef.current < MARK_READ_DEBOUNCE_MS) return;
      void tryMarkRead();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [conversationId, enabled, tryMarkRead]);

  useMessagingSocket({
    enabled: realtimeMode === 'ws' && !!conversationId && !isPending && enabled,
    conversationId,
    onMessageNew: handleMessageNew,
    getLastMessageId,
    onMessagesMerged: mergeIncomingMessages,
    onConnectionChange: handleSocketConnectionChange,
  });

  useEffect(() => {
    if (realtimeMode !== 'poll') return;
    if (!conversationId || isPending || !enabled) return;

    const poll = async () => {
      if (document.visibilityState !== 'visible') return;

      const list = messagesRef.current;
      const lastId = getLastPersistedMessageId(list);
      if (!lastId) return;

      try {
        const { messages: incoming } =
          await datingApi.conversations.fetchConversationMessages(conversationId, {
            after: lastId,
            limit: 100,
          });
        mergeIncomingMessages(incoming);
      } catch {
        // silent retry on next tick
      }
    };

    const intervalId = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [realtimeMode, conversationId, isPending, enabled, mergeIncomingMessages]);

  return {
    socketReconnecting,
    markAsRead: tryMarkRead,
  };
}
