import type { QueryClient } from '@tanstack/react-query';
import type { MessageDto, MessageListDto } from '@/lib/api-types/conversations';
import { queryKeys } from '@/lib/query-keys';

export const CONVERSATION_MESSAGES_STALE_TIME_MS = 300_000;
export const OPTIMISTIC_MESSAGE_ID_PREFIX = 'pending-';

export type ConversationMessagesCache = {
  messages: MessageDto[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
};

export function messageListToCache(dto: MessageListDto): ConversationMessagesCache {
  return {
    messages: dto.messages,
    pagination: {
      hasMore: dto.pagination.hasMore,
      nextCursor: dto.pagination.nextCursor,
    },
  };
}

export function appendUniqueMessages(
  prev: MessageDto[],
  incoming: MessageDto[],
): MessageDto[] {
  const ids = new Set(prev.map((m) => m.id));
  const append = incoming.filter((m) => !ids.has(m.id));
  if (append.length === 0) return prev;
  return [...prev, ...append];
}

function messagesQueryKey(conversationId: string) {
  return queryKeys.me.conversations.messages(conversationId);
}

export function appendMessagesInCache(
  queryClient: QueryClient,
  conversationId: string,
  incoming: MessageDto[],
): void {
  queryClient.setQueryData<ConversationMessagesCache>(
    messagesQueryKey(conversationId),
    (old) => {
      if (!old) return old;
      return {
        ...old,
        messages: appendUniqueMessages(old.messages, incoming),
      };
    },
  );
}

export function prependMessagesInCache(
  queryClient: QueryClient,
  conversationId: string,
  incoming: MessageDto[],
  pagination: ConversationMessagesCache['pagination'],
): void {
  queryClient.setQueryData<ConversationMessagesCache>(
    messagesQueryKey(conversationId),
    (old) => {
      if (!old) return old;
      const ids = new Set(old.messages.map((m) => m.id));
      const prepend = incoming.filter((m) => !ids.has(m.id));
      return {
        messages: [...prepend, ...old.messages],
        pagination,
      };
    },
  );
}

export function replaceMessageInCache(
  queryClient: QueryClient,
  conversationId: string,
  tempId: string,
  serverMessage: MessageDto,
): void {
  queryClient.setQueryData<ConversationMessagesCache>(
    messagesQueryKey(conversationId),
    (old) => {
      if (!old) return old;
      const withoutTemp = old.messages.filter((m) => m.id !== tempId);
      return {
        ...old,
        messages: appendUniqueMessages(withoutTemp, [serverMessage]),
      };
    },
  );
}

export function snapshotMessagesCache(
  queryClient: QueryClient,
  conversationId: string,
): ConversationMessagesCache | undefined {
  return queryClient.getQueryData(messagesQueryKey(conversationId));
}

export function createOptimisticMessage(
  conversationId: string,
  senderId: string,
  text: string,
): MessageDto {
  return {
    id: `${OPTIMISTIC_MESSAGE_ID_PREFIX}${crypto.randomUUID()}`,
    conversationId,
    senderId,
    text,
    createdAt: new Date().toISOString(),
    status: 'SENT',
  };
}

/** Last server-known message id — skips optimistic pending rows for poll/WS catch-up. */
export function getLastPersistedMessageId(
  messages: MessageDto[],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (!messages[i].id.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX)) {
      return messages[i].id;
    }
  }
  return undefined;
}
