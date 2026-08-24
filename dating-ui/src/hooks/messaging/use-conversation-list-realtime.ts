'use client';

import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type {
  ConversationListItemDto,
  MessageDto,
} from '@/lib/api/conversations-api';
import { getActiveConversationId } from '@/lib/messaging/conversation-focus';
import { applyIncomingMessageToConversationList } from '@/lib/messaging/conversation-list-unread';
import { useMessagingSocket } from '@/hooks/use-messaging-socket';

export type UseConversationListRealtimeOptions = {
  enabled: boolean;
  sessionUserId: string | undefined;
  /** Latest RQ-flattened rows; used when applying optimistic patch. */
  queryRows: ConversationListItemDto[];
  setOptimisticRows: Dispatch<
    SetStateAction<ConversationListItemDto[] | null>
  >;
};

/** List-page optimistic patch via shared messaging socket (no catch-up). */
export function useConversationListRealtime(
  options: UseConversationListRealtimeOptions,
): void {
  const { enabled, sessionUserId, queryRows, setOptimisticRows } = options;

  const handleListMessageNew = useCallback(
    (msg: MessageDto) => {
      if (!sessionUserId) return;
      const isOwn = msg.senderId === sessionUserId;
      const isActive = msg.conversationId === getActiveConversationId();
      const bumpUnread = !isOwn && !isActive;
      setOptimisticRows((prev) =>
        applyIncomingMessageToConversationList(prev ?? queryRows, msg, {
          bumpUnread,
        }),
      );
    },
    [sessionUserId, queryRows, setOptimisticRows],
  );

  useMessagingSocket({
    enabled,
    onMessageNew: handleListMessageNew,
    getLastMessageId: () => undefined,
    onMessagesMerged: () => {},
  });
}
