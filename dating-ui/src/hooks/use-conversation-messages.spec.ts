/** @vitest-environment jsdom */
import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { useConversationMessages } from './use-conversation-messages';
import { OPTIMISTIC_MESSAGE_ID_PREFIX } from './conversation-messages-cache';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';
import * as messagingSocket from '@/hooks/use-messaging-socket';
import * as realtimeMode from '@/lib/realtime-mode';

const {
  fetchConversationMessages,
  markConversationAsRead,
  sendConversationMessage,
} = vi.hoisted(() => ({
  fetchConversationMessages: vi.fn(),
  markConversationAsRead: vi.fn(),
  sendConversationMessage: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    conversations: {
      fetchConversationMessages,
      markConversationAsRead,
      sendConversationMessage,
    },
  },
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/hooks/use-messaging-socket');
vi.mock('@/lib/realtime-mode');

const mockFetchConversationMessages = vi.mocked(fetchConversationMessages);
const mockMarkConversationAsRead = vi.mocked(markConversationAsRead);
const mockSendConversationMessage = vi.mocked(sendConversationMessage);
const mockUseMessagingSocket = vi.mocked(messagingSocket.useMessagingSocket);
const mockGetRealtimeMode = vi.mocked(realtimeMode.getRealtimeMode);

const mockMessages = [
  {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    text: 'Hello',
    createdAt: '2024-01-01T00:00:00Z',
    status: 'SENT' as const,
  },
  {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: 'user-2',
    text: 'Hi there',
    createdAt: '2024-01-01T00:01:00Z',
    status: 'SENT' as const,
  },
];

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientTestProvider,
    { client: createTestQueryClient() },
    children,
  );
}

describe('useConversationMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRealtimeMode.mockReturnValue('poll');
    mockUseMessagingSocket.mockReturnValue(undefined);
    mockMarkConversationAsRead.mockResolvedValue({ lastReadAt: '2024-01-01T00:00:00Z' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should load messages on mount', async () => {
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: {
        hasMore: false,
        nextCursor: null,
      },
    });

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.messages).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual(mockMessages);
    expect(result.current.error).toBeNull();
    expect(mockFetchConversationMessages).toHaveBeenCalledWith('conv-1');
  });

  it('should handle load error', async () => {
    const errorMessage = 'Network error';
    mockFetchConversationMessages.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.messages).toEqual([]);
  });

  it('should show optimistic pending message before send resolves', async () => {
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    let resolveSend!: (value: (typeof mockMessages)[0]) => void;
    mockSendConversationMessage.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    );

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      void result.current.sendMessage('New message');
    });

    await waitFor(() => {
      expect(result.current.messages.some((m) =>
        m.id.startsWith(OPTIMISTIC_MESSAGE_ID_PREFIX),
      )).toBe(true);
      expect(result.current.sending).toBe(true);
    });

    const sentMessage = {
      id: 'msg-3',
      conversationId: 'conv-1',
      senderId: 'user-1',
      text: 'New message',
      createdAt: '2024-01-01T00:02:00Z',
      status: 'SENT' as const,
    };
    resolveSend(sentMessage);

    await waitFor(() => {
      expect(result.current.sending).toBe(false);
    });

    expect(result.current.messages).toHaveLength(3);
    expect(result.current.messages[2]).toEqual(sentMessage);
    expect(mockSendConversationMessage).toHaveBeenCalledWith('conv-1', 'New message');
  });

  it('should handle send error', async () => {
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    const errorMessage = 'Send failed';
    mockSendConversationMessage.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.sendMessage('Test')).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.sendError).toBe(errorMessage);
      expect(result.current.sendModerationDetails).toBeNull();
      expect(result.current.sending).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
  });

  it('should expose moderation details on send moderation failure', async () => {
    const { ContentModerationApiError } = await import(
      '@/lib/content-moderation-error'
    );
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: { hasMore: false, nextCursor: null },
    });
    mockSendConversationMessage.mockRejectedValue(
      new ContentModerationApiError(
        'message_content_moderation_failed',
        {
          category: 'sexual',
          flaggedText: 'x',
          reason: 'Why',
          suggestion: 'Suggestion',
          muted: '1 hour',
        },
      ),
    );

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await expect(result.current.sendMessage('bad')).rejects.toThrow();

    await waitFor(() => {
      expect(result.current.sendError).toBeNull();
      expect(result.current.sendModerationDetails).toMatchObject({
        flaggedText: 'x',
        suggestion: 'Suggestion',
        muted: '1 hour',
      });
    });
  });

  it('should mark conversation as read', async () => {
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    const onRefreshUnread = vi.fn();

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
          onRefreshUnread,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.markAsRead();

    expect(mockMarkConversationAsRead).toHaveBeenCalledWith('conv-1');
    expect(onRefreshUnread).toHaveBeenCalled();
  });

  it('should load earlier messages', async () => {
    mockGetRealtimeMode.mockReturnValue('ws');
    const earlierMessages = [
      {
        id: 'msg-0',
        conversationId: 'conv-1',
        senderId: 'user-1',
        text: 'Earlier message',
        createdAt: '2023-12-31T23:59:00Z',
        status: 'SENT' as const,
      },
    ];

    mockFetchConversationMessages.mockResolvedValueOnce({
      messages: mockMessages,
      pagination: { hasMore: true, nextCursor: 'cursor-1' },
    });

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);

    mockFetchConversationMessages.mockResolvedValueOnce({
      messages: earlierMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    await result.current.loadEarlier();

    await waitFor(() => {
      expect(result.current.loadingEarlier).toBe(false);
      expect(result.current.messages).toHaveLength(3);
    });

    expect(result.current.messages[0]).toEqual(earlierMessages[0]);
    expect(result.current.hasMore).toBe(false);
    expect(mockFetchConversationMessages).toHaveBeenCalledWith('conv-1', {
      before: 'cursor-1',
    });
  });

  it('should refresh messages', async () => {
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const newMessages = [
      ...mockMessages,
      {
        id: 'msg-3',
        conversationId: 'conv-1',
        senderId: 'user-1',
        text: 'Refreshed',
        createdAt: '2024-01-01T00:02:00Z',
        status: 'SENT' as const,
      },
    ];

    mockFetchConversationMessages.mockResolvedValue({
      messages: newMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    await result.current.refresh();

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(3);
    });

    expect(result.current.messages).toEqual(newMessages);
  });

  it('should integrate with websocket when realtime mode is ws', async () => {
    mockGetRealtimeMode.mockReturnValue('ws');
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await waitFor(() => {
      expect(mockUseMessagingSocket).toHaveBeenCalled();
    });

    const callArgs =
      mockUseMessagingSocket.mock.calls[
        mockUseMessagingSocket.mock.calls.length - 1
      ][0];
    expect(callArgs.enabled).toBe(true);
    expect(callArgs.conversationId).toBe('conv-1');
    expect(callArgs.onMessageNew).toBeDefined();
    expect(callArgs.getLastMessageId).toBeDefined();
  });

  it('should not load when disabled', async () => {
    renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: false,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(mockFetchConversationMessages).not.toHaveBeenCalled();
    });
  });

  it('should deduplicate incoming messages', async () => {
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    const sentMessage = mockMessages[0];
    mockSendConversationMessage.mockResolvedValue(sentMessage);

    const { result } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await result.current.sendMessage('Hello');

    await waitFor(() => {
      expect(result.current.sending).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
  });

  it('should reuse cached messages on remount within stale window', async () => {
    mockFetchConversationMessages.mockResolvedValue({
      messages: mockMessages,
      pagination: { hasMore: false, nextCursor: null },
    });

    const client = createTestQueryClient();
    const queryWrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientTestProvider, { client }, children);

    const { unmount } = renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper: queryWrapper },
    );

    await waitFor(() => {
      expect(mockFetchConversationMessages).toHaveBeenCalledTimes(1);
    });

    unmount();

    renderHook(
      () =>
        useConversationMessages({
          conversationId: 'conv-1',
          enabled: true,
        }),
      { wrapper: queryWrapper },
    );

    await waitFor(() => {
      expect(mockFetchConversationMessages).toHaveBeenCalledTimes(1);
    });
  });
});
