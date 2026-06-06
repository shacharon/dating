'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import {
  fetchMyConversations,
  type ConversationListItemDto,
} from '@/lib/conversations-api';
import {
  bumpUnreadTotal,
  sumUnreadCounts,
} from '@/lib/conversation-unread-total';

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
  const [totalUnread, setTotalUnread] = useState(0);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);

  const reconcileFromList = useCallback(
    (conversations: ConversationListItemDto[]) => {
      setTotalUnread(sumUnreadCounts(conversations));
      onConversationsFetched?.(conversations);
    },
    [onConversationsFetched],
  );

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }
    const run = (async () => {
      try {
        const dto = await fetchMyConversations();
        const conversations = dto.conversations ?? [];
        reconcileFromList(conversations);
      } catch {
        // silent — nav badge keeps last known total
      } finally {
        refreshInFlightRef.current = null;
      }
    })();
    refreshInFlightRef.current = run;
    return run;
  }, [reconcileFromList]);

  const bumpFromMessage = useCallback((conversationId: string) => {
    setTotalUnread((prev) => bumpUnreadTotal(prev, conversationId));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
