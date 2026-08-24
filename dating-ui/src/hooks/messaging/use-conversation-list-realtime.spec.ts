import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useConversationListRealtime } from './use-conversation-list-realtime';
import * as messagingSocket from '@/hooks/use-messaging-socket';
import * as conversationFocus from '@/lib/messaging/conversation-focus';
import type {
  ConversationListItemDto,
  MessageDto,
} from '@/lib/api/conversations-api';

vi.mock('@/hooks/use-messaging-socket');
vi.mock('@/lib/messaging/conversation-focus');

const mockUseMessagingSocket = vi.mocked(messagingSocket.useMessagingSocket);
const mockGetActiveConversationId = vi.mocked(
  conversationFocus.getActiveConversationId,
);

const otherUser = {
  id: 'peer-1',
  profileId: 'prof-1',
  nickname: 'Peer',
  gender: null,
  ageYears: null,
  locationLabel: null,
  photoUrl: null,
};

describe('useConversationListRealtime', () => {
  const queryRows: ConversationListItemDto[] = [
    {
      id: 'conv-1',
      otherUser,
      matchedAt: '2024-01-01T00:00:00Z',
      unreadCount: 0,
      lastMessage: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMessagingSocket.mockReturnValue(undefined);
    mockGetActiveConversationId.mockReturnValue(null);
  });

  it('wires useMessagingSocket when enabled and patches list on message.new', () => {
    const setOptimisticRows = vi.fn();

    renderHook(() =>
      useConversationListRealtime({
        enabled: true,
        sessionUserId: 'me',
        queryRows,
        setOptimisticRows,
      }),
    );

    expect(mockUseMessagingSocket).toHaveBeenCalled();
    const opts = mockUseMessagingSocket.mock.calls.at(-1)?.[0];
    expect(opts?.enabled).toBe(true);

    const msg: MessageDto = {
      id: 'm1',
      conversationId: 'conv-1',
      senderId: 'peer-1',
      text: 'hello',
      createdAt: '2024-01-02T00:00:00Z',
      status: 'SENT',
    };
    opts?.onMessageNew(msg);

    expect(setOptimisticRows).toHaveBeenCalled();
    const updater = setOptimisticRows.mock.calls[0][0] as (
      prev: ConversationListItemDto[] | null,
    ) => ConversationListItemDto[];
    const next = updater(null);
    expect(next[0]?.lastMessage?.text).toBe('hello');
    expect(next[0]?.unreadCount).toBe(1);
  });

  it('does not bump unread for own messages', () => {
    const setOptimisticRows = vi.fn();

    renderHook(() =>
      useConversationListRealtime({
        enabled: true,
        sessionUserId: 'me',
        queryRows,
        setOptimisticRows,
      }),
    );

    const opts = mockUseMessagingSocket.mock.calls.at(-1)?.[0];
    opts?.onMessageNew({
      id: 'm2',
      conversationId: 'conv-1',
      senderId: 'me',
      text: 'mine',
      createdAt: '2024-01-02T00:00:00Z',
      status: 'SENT',
    });

    const updater = setOptimisticRows.mock.calls[0][0] as (
      prev: ConversationListItemDto[] | null,
    ) => ConversationListItemDto[];
    const next = updater(null);
    expect(next[0]?.unreadCount).toBe(0);
    expect(next[0]?.lastMessage?.text).toBe('mine');
  });
});
