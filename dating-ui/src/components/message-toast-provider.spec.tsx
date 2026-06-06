/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';

const { fetchMyConversations, getRealtimeMode, getActiveConversationId, pushMock, onMessageNewRef } =
  vi.hoisted(() => {
    const onMessageNewRef: {
      current: ((msg: unknown) => void) | null;
    } = { current: null };

    return {
      fetchMyConversations: vi.fn(),
      getRealtimeMode: vi.fn(() => 'ws' as const),
      getActiveConversationId: vi.fn(() => null as string | null),
      pushMock: vi.fn(),
      onMessageNewRef,
    };
  });

vi.mock('@/lib/conversations-api', () => ({
  fetchMyConversations,
}));

vi.mock('@/lib/realtime-mode', () => ({
  getRealtimeMode,
}));

vi.mock('@/lib/conversation-focus', () => ({
  getActiveConversationId,
}));

vi.mock('@/hooks/use-messaging-socket', () => ({
  useMessagingSocket: (options: {
    enabled: boolean;
    onMessageNew: (msg: unknown) => void;
  }) => {
    if (options.enabled) {
      onMessageNewRef.current = options.onMessageNew;
    }
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { MessageToastProvider } from '@/components/message-toast-provider';
import { MESSAGE_TOAST_AUTO_DISMISS_MS } from '@/lib/message-toast.constants';

const peerMessage = {
  id: 'msg_1',
  conversationId: 'conv_1',
  senderId: 'user_peer',
  text: 'Hi',
  createdAt: '2026-06-06T12:00:00.000Z',
  status: 'SENT' as const,
};

describe('MessageToastProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRealtimeMode.mockReturnValue('ws');
    getActiveConversationId.mockReturnValue(null);
    onMessageNewRef.current = null;
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'conv_1',
          matchedAt: '2026-06-01T10:00:00.000Z',
          unreadCount: 0,
          otherUser: {
            id: 'user_peer',
            profileId: 'prof_peer',
            nickname: 'Noa',
            gender: 'FEMALE',
            ageYears: 30,
            locationLabel: 'Tel Aviv',
            photoUrl: null,
          },
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('shows toast on peer message.new', async () => {
    render(
      <MessageToastProvider sessionUserId="user_me">
        <div>child</div>
      </MessageToastProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByTestId('message-toast')).toBeTruthy();
      expect(screen.getByText(/Noa sent you a message/)).toBeTruthy();
    });
  });

  it('skips toast for own message', async () => {
    render(
      <MessageToastProvider sessionUserId="user_me">
        <div>child</div>
      </MessageToastProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.({
      ...peerMessage,
      senderId: 'user_me',
    });

    expect(screen.queryByTestId('message-toast')).toBeNull();
  });

  it('skips toast when active conversation matches', async () => {
    getActiveConversationId.mockReturnValue('conv_1');

    render(
      <MessageToastProvider sessionUserId="user_me">
        <div>child</div>
      </MessageToastProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    expect(screen.queryByTestId('message-toast')).toBeNull();
  });

  it('navigates to conversation when toast is clicked', async () => {
    render(
      <MessageToastProvider sessionUserId="user_me">
        <div>child</div>
      </MessageToastProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByTestId('message-toast')).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/Noa sent you a message/));

    expect(pushMock).toHaveBeenCalledWith('/dating/conversations/conv_1');
    expect(screen.queryByTestId('message-toast')).toBeNull();
  });

  it('auto-dismisses after configured duration', async () => {
    render(
      <MessageToastProvider sessionUserId="user_me">
        <div>child</div>
      </MessageToastProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    vi.useFakeTimers();
    act(() => {
      onMessageNewRef.current?.(peerMessage);
    });

    expect(screen.getByTestId('message-toast')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(MESSAGE_TOAST_AUTO_DISMISS_MS);
    });

    expect(screen.queryByTestId('message-toast')).toBeNull();
  });

  it('dismisses toast when close button is clicked', async () => {
    render(
      <MessageToastProvider sessionUserId="user_me">
        <div>child</div>
      </MessageToastProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByTestId('message-toast')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByTestId('message-toast')).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('uses Someone when peer label cache is empty', async () => {
    fetchMyConversations.mockResolvedValue({ conversations: [] });

    render(
      <MessageToastProvider sessionUserId="user_me">
        <div>child</div>
      </MessageToastProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByText(/Someone sent you a message/)).toBeTruthy();
    });
  });

  it('does not wire handler when realtime mode is poll', () => {
    getRealtimeMode.mockReturnValue('poll');

    render(
      <MessageToastProvider sessionUserId="user_me">
        <div>child</div>
      </MessageToastProvider>,
    );

    expect(onMessageNewRef.current).toBeNull();
  });
});
