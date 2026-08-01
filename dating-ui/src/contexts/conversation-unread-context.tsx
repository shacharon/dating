'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
  type ReactElement,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchConversationsUnreadTotal,
  type ConversationListItemDto,
  type ConversationsUnreadTotalDto,
} from '@/lib/conversations-api';
import { bumpUnreadTotal } from '@/lib/conversation-unread-total';
import { queryKeys } from '@/lib/query-keys';

export type ConversationUnreadContextValue = {
  totalUnread: number;
  refresh: () => Promise<void>;
  reconcileFromList: (conversations: ConversationListItemDto[]) => void;
  bumpFromMessage: (conversationId: string) => void;
};

const ConversationUnreadContext =
  createContext<ConversationUnreadContextValue | null>(null);

export function ConversationUnreadProvider({
  children,
  onConversationsFetched,
}: {
  children: ReactNode;
  onConversationsFetched?: (conversations: ConversationListItemDto[]) => void;
}): ReactElement {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.me.conversations.unreadTotal,
    queryFn: fetchConversationsUnreadTotal,
  });

  const totalUnread = data?.totalUnread ?? 0;

  const reconcileFromList = useCallback(
    (conversations: ConversationListItemDto[]) => {
      // Partial list pages must not overwrite badge total (Sprint 29 Story 2).
      onConversationsFetched?.(conversations);
    },
    [onConversationsFetched],
  );

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.me.conversations.unreadTotal,
    });
  }, [queryClient]);

  const bumpFromMessage = useCallback(
    (conversationId: string) => {
      queryClient.setQueryData<ConversationsUnreadTotalDto>(
        queryKeys.me.conversations.unreadTotal,
        (prev) => ({
          totalUnread: bumpUnreadTotal(prev?.totalUnread ?? 0, conversationId),
        }),
      );
    },
    [queryClient],
  );

  const value = useMemo(
    () => ({
      totalUnread,
      refresh,
      reconcileFromList,
      bumpFromMessage,
    }),
    [totalUnread, refresh, reconcileFromList, bumpFromMessage],
  );

  return (
    <ConversationUnreadContext.Provider value={value}>
      {children}
    </ConversationUnreadContext.Provider>
  );
}

export function useConversationUnread(): ConversationUnreadContextValue {
  const ctx = useContext(ConversationUnreadContext);
  if (!ctx) {
    throw new Error(
      'useConversationUnread must be used within ConversationUnreadProvider',
    );
  }
  return ctx;
}
