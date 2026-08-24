'use client';

import type { MessageDto } from '@/lib/api-types/conversations';
import type { ContentModerationDetails } from '@/lib/moderation/content-moderation-error';
import { useConversationMessageSend } from '@/hooks/use-conversation-message-send';
import { useConversationMessagesSync } from '@/hooks/use-conversation-messages-sync';
import { useConversationMessagesThread } from '@/hooks/use-conversation-messages-thread';

export type { SendMessageContext } from '@/hooks/use-conversation-message-send-mutation';
export { useSendConversationMessage } from '@/hooks/use-conversation-message-send-mutation';

export interface UseConversationMessagesOptions {
  conversationId: string;
  enabled?: boolean;
  onRefreshUnread?: () => void;
}

export interface UseConversationMessagesReturn {
  messages: MessageDto[];
  loading: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  sending: boolean;
  sendError: string | null;
  sendModerationDetails: ContentModerationDetails | null;
  clearSendError: () => void;
  markAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  hasMore: boolean;
  loadEarlier: () => Promise<void>;
  loadingEarlier: boolean;
  socketReconnecting: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  initialScrollDone: boolean;
}

export function useConversationMessages(
  options: UseConversationMessagesOptions,
): UseConversationMessagesReturn {
  const { conversationId, enabled = true, onRefreshUnread } = options;

  const thread = useConversationMessagesThread({ conversationId, enabled });
  const sync = useConversationMessagesSync({
    conversationId,
    enabled,
    isPending: thread.isPending,
    messagesRef: thread.messagesRef,
    onRefreshUnread,
  });
  const send = useConversationMessageSend(conversationId);

  return {
    messages: thread.messages,
    loading: thread.isPending,
    error: thread.actionError ?? thread.queryErrorMessage,
    sendMessage: send.sendMessage,
    sending: send.sending,
    sendError: send.sendError,
    sendModerationDetails: send.sendModerationDetails,
    clearSendError: send.clearSendError,
    markAsRead: sync.markAsRead,
    refresh: thread.refresh,
    hasMore: thread.hasMore,
    loadEarlier: thread.loadEarlier,
    loadingEarlier: thread.loadingEarlier,
    socketReconnecting: sync.socketReconnecting,
    listRef: thread.listRef,
    initialScrollDone: thread.initialScrollDone,
  };
}
