/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { MessageDto } from '@/lib/conversations-api';
import { useMessagingSocket } from './use-messaging-socket';

const {
  createMessagingSocket,
  messageNewHandlerRef,
  connectHandlerRef,
  disconnectHandlerRef,
  fetchConversationMessages,
} = vi.hoisted(() => {
  const messageNewHandlerRef: {
    current: ((msg: MessageDto) => void) | null;
  } = { current: null };
  const connectHandlerRef: { current: (() => void) | null } = { current: null };
  const disconnectHandlerRef: { current: (() => void) | null } = {
    current: null,
  };

  const socket = {
    on: vi.fn((event: string, fn: () => void) => {
      if (event === 'message.new') {
        messageNewHandlerRef.current = fn as (msg: MessageDto) => void;
      }
      if (event === 'connect') {
        connectHandlerRef.current = fn;
      }
      if (event === 'disconnect') {
        disconnectHandlerRef.current = fn;
      }
    }),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    messageNewHandlerRef,
    connectHandlerRef,
    disconnectHandlerRef,
    createMessagingSocket: vi.fn(() => socket),
    fetchConversationMessages: vi.fn(),
  };
});

vi.mock('@/lib/messaging-socket', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/messaging-socket')>();
  return {
    ...actual,
    createMessagingSocket,
    MESSAGING_EVENT_MESSAGE_NEW: 'message.new',
  };
});

vi.mock('@/lib/conversations-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/conversations-api')>();
  return {
    ...actual,
    fetchConversationMessages,
  };
});

describe('useMessagingSocket', () => {
  const onMessageNew = vi.fn();
  const onMessagesMerged = vi.fn();
  const onConnectionChange = vi.fn();
  const getLastMessageId = vi.fn(() => 'msg_tail' as string | undefined);

  const openMessage: MessageDto = {
    id: 'msg_1',
    conversationId: 'conv_open',
    senderId: 'user_a',
    text: 'Hi',
    createdAt: '2026-06-03T12:00:00.000Z',
    status: 'SENT',
  };

  const defaultOptions = {
    enabled: true,
    conversationId: 'conv_open',
    onMessageNew,
    getLastMessageId,
    onMessagesMerged,
    onConnectionChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    messageNewHandlerRef.current = null;
    connectHandlerRef.current = null;
    disconnectHandlerRef.current = null;
    onMessageNew.mockReset();
    onMessagesMerged.mockReset();
    onConnectionChange.mockReset();
    getLastMessageId.mockReturnValue('msg_tail');
    fetchConversationMessages.mockResolvedValue({
      messages: [],
      pagination: { hasMore: false, nextCursor: null },
    });
  });

  it('connects and forwards message.new for the open conversation', () => {
    renderHook(() => useMessagingSocket(defaultOptions));

    expect(createMessagingSocket).toHaveBeenCalledTimes(1);
    expect(messageNewHandlerRef.current).toBeTruthy();
    messageNewHandlerRef.current!(openMessage);
    expect(onMessageNew).toHaveBeenCalledWith(openMessage);
  });

  it('ignores message.new for a different conversationId', () => {
    renderHook(() => useMessagingSocket(defaultOptions));

    messageNewHandlerRef.current!({
      ...openMessage,
      id: 'msg_2',
      conversationId: 'conv_other',
    });
    expect(onMessageNew).not.toHaveBeenCalled();
  });

  it('connects without conversationId for list-wide subscription', () => {
    renderHook(() =>
      useMessagingSocket({
        ...defaultOptions,
        conversationId: undefined,
      }),
    );

    expect(createMessagingSocket).toHaveBeenCalledTimes(1);
    connectHandlerRef.current!();
    expect(fetchConversationMessages).not.toHaveBeenCalled();
  });

  it('forwards message.new from any conversation when conversationId is omitted', () => {
    renderHook(() =>
      useMessagingSocket({
        ...defaultOptions,
        conversationId: undefined,
      }),
    );

    const otherConv: MessageDto = {
      ...openMessage,
      id: 'msg_other',
      conversationId: 'conv_other',
    };
    messageNewHandlerRef.current!(otherConv);
    expect(onMessageNew).toHaveBeenCalledWith(otherConv);
  });

  it('does not connect when disabled', () => {
    renderHook(() =>
      useMessagingSocket({ ...defaultOptions, enabled: false }),
    );

    expect(createMessagingSocket).not.toHaveBeenCalled();
  });

  it('emits conversation.subscribe on connect when conversationId is set', () => {
    renderHook(() => useMessagingSocket(defaultOptions));
    const socket = createMessagingSocket.mock.results.at(-1)?.value as {
      emit: ReturnType<typeof vi.fn>;
    };
    connectHandlerRef.current!();

    expect(socket.emit).toHaveBeenCalledWith('conversation.subscribe', {
      conversationId: 'conv_open',
    });
  });

  it('emits conversation.unsubscribe on cleanup when conversationId is set', () => {
    const { unmount } = renderHook(() => useMessagingSocket(defaultOptions));
    const socket = createMessagingSocket.mock.results[0]?.value as {
      emit: ReturnType<typeof vi.fn>;
    };
    connectHandlerRef.current!();
    unmount();

    expect(socket.emit).toHaveBeenCalledWith('conversation.unsubscribe', {
      conversationId: 'conv_open',
    });
  });

  it('does not emit subscribe when conversationId is omitted', () => {
    renderHook(() =>
      useMessagingSocket({
        ...defaultOptions,
        conversationId: undefined,
      }),
    );
    const socket = createMessagingSocket.mock.results[0]?.value as {
      emit: ReturnType<typeof vi.fn>;
    };
    connectHandlerRef.current!();

    expect(socket.emit).not.toHaveBeenCalled();
  });

  it('runs catch-up on connect when last message id exists', async () => {
    const missed: MessageDto = {
      id: 'msg_missed',
      conversationId: 'conv_open',
      senderId: 'user_b',
      text: 'While offline',
      createdAt: '2026-06-03T13:00:00.000Z',
      status: 'SENT',
    };
    fetchConversationMessages.mockResolvedValue({
      messages: [missed],
      pagination: { hasMore: false, nextCursor: null },
    });

    renderHook(() => useMessagingSocket(defaultOptions));
    connectHandlerRef.current!();

    await vi.waitFor(() => {
      expect(fetchConversationMessages).toHaveBeenCalledWith('conv_open', {
        after: 'msg_tail',
        limit: 100,
      });
      expect(onMessagesMerged).toHaveBeenCalledWith([missed]);
      expect(onConnectionChange).toHaveBeenCalledWith('connected');
    });
  });

  it('skips catch-up when thread has no last message id', async () => {
    getLastMessageId.mockReturnValue(undefined);

    renderHook(() => useMessagingSocket(defaultOptions));
    connectHandlerRef.current!();

    await vi.waitFor(() => {
      expect(onConnectionChange).toHaveBeenCalledWith('connected');
    });
    expect(fetchConversationMessages).not.toHaveBeenCalled();
  });

  it('reports reconnecting after disconnect following connect', () => {
    renderHook(() => useMessagingSocket(defaultOptions));

    connectHandlerRef.current!();
    disconnectHandlerRef.current!();

    expect(onConnectionChange).toHaveBeenCalledWith('connected');
    expect(onConnectionChange).toHaveBeenCalledWith('reconnecting');
  });

  it('allows only one catch-up fetch at a time when connect fires twice quickly', async () => {
    let resolveFetch: (value: {
      messages: MessageDto[];
      pagination: { hasMore: boolean; nextCursor: null };
    }) => void = () => {};
    fetchConversationMessages.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    renderHook(() => useMessagingSocket(defaultOptions));
    connectHandlerRef.current!();
    connectHandlerRef.current!();

    expect(fetchConversationMessages).toHaveBeenCalledTimes(1);

    resolveFetch({
      messages: [],
      pagination: { hasMore: false, nextCursor: null },
    });

    await vi.waitFor(() => {
      expect(fetchConversationMessages).toHaveBeenCalledTimes(1);
    });

    connectHandlerRef.current!();

    await vi.waitFor(() => {
      expect(fetchConversationMessages).toHaveBeenCalledTimes(2);
    });
  });

  it('does not report reconnecting on disconnect before first connect', () => {
    renderHook(() => useMessagingSocket(defaultOptions));

    disconnectHandlerRef.current!();

    expect(onConnectionChange).not.toHaveBeenCalled();
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useMessagingSocket(defaultOptions));

    const socket = createMessagingSocket.mock.results[0]?.value as {
      disconnect: ReturnType<typeof vi.fn>;
      off: ReturnType<typeof vi.fn>;
    };
    unmount();
    expect(socket.off).toHaveBeenCalledWith(
      'message.new',
      expect.any(Function),
    );
    expect(socket.off).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(socket.off).toHaveBeenCalledWith(
      'disconnect',
      expect.any(Function),
    );
    expect(socket.disconnect).toHaveBeenCalled();
  });
});
