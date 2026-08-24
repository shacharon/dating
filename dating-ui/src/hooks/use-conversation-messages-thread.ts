'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { datingApi } from '@/lib/api-sdk';
import type { MessageDto } from '@/lib/api-types/conversations';
import { queryKeys } from '@/lib/query/query-keys';
import {
  CONVERSATION_MESSAGES_STALE_TIME_MS,
  messageListToCache,
  prependMessagesInCache,
} from '@/hooks/conversation-messages-cache';

export type UseConversationMessagesThreadOptions = {
  conversationId: string;
  enabled?: boolean;
};

export type UseConversationMessagesThreadResult = {
  messages: MessageDto[];
  isPending: boolean;
  queryErrorMessage: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  refresh: () => Promise<void>;
  loadEarlier: () => Promise<void>;
  loadingEarlier: boolean;
  actionError: string | null;
  listRef: React.RefObject<HTMLDivElement | null>;
  initialScrollDone: boolean;
  messagesRef: React.RefObject<MessageDto[]>;
};

export function useConversationMessagesThread(
  options: UseConversationMessagesThreadOptions,
): UseConversationMessagesThreadResult {
  const { conversationId, enabled = true } = options;
  const queryClient = useQueryClient();
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  const messagesRef = useRef<MessageDto[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    data,
    error: queryError,
    isPending,
    refetch,
  } = useQuery({
    queryKey: queryKeys.me.conversations.messages(conversationId),
    queryFn: async () => {
      const dto =
        await datingApi.conversations.fetchConversationMessages(conversationId);
      return messageListToCache(dto);
    },
    enabled: !!conversationId && enabled,
    staleTime: CONVERSATION_MESSAGES_STALE_TIME_MS,
  });

  const messages = data?.messages ?? [];
  const hasMore = data?.pagination.hasMore ?? false;
  const nextCursor = data?.pagination.nextCursor ?? null;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setInitialScrollDone(false);
  }, [conversationId]);

  const refresh = useCallback(async () => {
    if (!conversationId || !enabled) return;
    setInitialScrollDone(false);
    await refetch();
  }, [conversationId, enabled, refetch]);

  const loadEarlier = useCallback(async () => {
    if (!conversationId || !hasMore || !nextCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    setActionError(null);
    const listEl = listRef.current;
    const prevScrollHeight = listEl?.scrollHeight ?? 0;

    try {
      const result = await datingApi.conversations.fetchConversationMessages(
        conversationId,
        { before: nextCursor },
      );
      prependMessagesInCache(
        queryClient,
        conversationId,
        result.messages,
        {
          hasMore: result.pagination.hasMore,
          nextCursor: result.pagination.nextCursor,
        },
      );

      requestAnimationFrame(() => {
        if (!listEl) return;
        const newScrollHeight = listEl.scrollHeight;
        listEl.scrollTop += newScrollHeight - prevScrollHeight;
      });
    } catch (e: unknown) {
      setActionError(
        e instanceof Error ? e.message : 'Failed to load earlier messages',
      );
    } finally {
      setLoadingEarlier(false);
    }
  }, [
    hasMore,
    conversationId,
    loadingEarlier,
    nextCursor,
    queryClient,
  ]);

  useEffect(() => {
    if (isPending || initialScrollDone) return;
    if (messages.length === 0) return;
    setInitialScrollDone(true);
  }, [isPending, messages.length, initialScrollDone]);

  const queryErrorMessage =
    queryError instanceof Error
      ? queryError.message
      : queryError
        ? 'Failed to load messages'
        : null;

  return {
    messages,
    isPending,
    queryErrorMessage,
    hasMore,
    nextCursor,
    refresh,
    loadEarlier,
    loadingEarlier,
    actionError,
    listRef,
    initialScrollDone,
    messagesRef,
  };
}
