import { describe, it, expect } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { MessageDto } from '@/lib/api-types/conversations';
import { queryKeys } from '@/lib/query/query-keys';
import {
  appendUniqueMessages,
  appendMessagesInCache,
  prependMessagesInCache,
  replaceMessageInCache,
  getLastPersistedMessageId,
  OPTIMISTIC_MESSAGE_ID_PREFIX,
  type ConversationMessagesCache,
} from './conversation-messages-cache';

const baseMessage = (
  id: string,
  overrides?: Partial<MessageDto>,
): MessageDto => ({
  id,
  conversationId: 'conv-1',
  senderId: 'user-1',
  text: `text-${id}`,
  createdAt: '2024-01-01T00:00:00Z',
  status: 'SENT',
  ...overrides,
});

const emptyCache = (): ConversationMessagesCache => ({
  messages: [baseMessage('m1'), baseMessage('m2')],
  pagination: { hasMore: true, nextCursor: 'cursor-1' },
});

describe('conversation-messages-cache', () => {
  it('appendUniqueMessages dedupes by id', () => {
    const prev = [baseMessage('m1')];
    const result = appendUniqueMessages(prev, [
      baseMessage('m1'),
      baseMessage('m2'),
    ]);
    expect(result).toHaveLength(2);
    expect(result[1].id).toBe('m2');
  });

  it('appendMessagesInCache merges incoming rows', () => {
    const client = new QueryClient();
    const data = emptyCache();
    client.setQueryData(queryKeys.me.conversations.messages('conv-1'), data);

    appendMessagesInCache(client, 'conv-1', [baseMessage('m3')]);

    const updated = client.getQueryData<ConversationMessagesCache>(
      queryKeys.me.conversations.messages('conv-1'),
    );
    expect(updated?.messages).toHaveLength(3);
    expect(updated?.messages[2].id).toBe('m3');
  });

  it('prependMessagesInCache prepends and updates pagination', () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.me.conversations.messages('conv-1'), emptyCache());

    prependMessagesInCache(
      client,
      'conv-1',
      [baseMessage('m0')],
      { hasMore: false, nextCursor: null },
    );

    const updated = client.getQueryData<ConversationMessagesCache>(
      queryKeys.me.conversations.messages('conv-1'),
    );
    expect(updated?.messages[0].id).toBe('m0');
    expect(updated?.pagination.hasMore).toBe(false);
  });

  it('replaceMessageInCache swaps temp id and dedupes server message', () => {
    const client = new QueryClient();
    client.setQueryData(queryKeys.me.conversations.messages('conv-1'), emptyCache());

    const tempId = `${OPTIMISTIC_MESSAGE_ID_PREFIX}temp-1`;
    replaceMessageInCache(client, 'conv-1', tempId, baseMessage('m1'));

    const updated = client.getQueryData<ConversationMessagesCache>(
      queryKeys.me.conversations.messages('conv-1'),
    );
    expect(updated?.messages).toHaveLength(2);
    expect(updated?.messages.every((m) => !m.id.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX))).toBe(
      true,
    );
  });

  it('getLastPersistedMessageId skips optimistic pending rows', () => {
    const messages = [
      baseMessage('m1'),
      {
        ...baseMessage('pending-1'),
        id: `${OPTIMISTIC_MESSAGE_ID_PREFIX}temp`,
      },
    ];
    expect(getLastPersistedMessageId(messages)).toBe('m1');
  });
});
