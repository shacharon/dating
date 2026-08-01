/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react';

const {
  fetchConversationsUnreadTotal,
  getRealtimeMode,
  getActiveConversationId,
  pushMock,
  onMessageNewRef,
} = vi.hoisted(() => {
  const onMessageNewRef: {
    current: ((msg: unknown) => void) | null;
  } = { current: null };

  return {
    fetchConversationsUnreadTotal: vi.fn(),
    getRealtimeMode: vi.fn(() => 'ws' as const),
    getActiveConversationId: vi.fn(() => null as string | null),
    pushMock: vi.fn(),
    onMessageNewRef,
  };
});

vi.mock('@/lib/conversations-api', () => ({
  fetchConversationsUnreadTotal,
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

import { MessagingShellProvider } from '@/components/messaging-shell-provider';
import { useConversationUnread } from '@/contexts/conversation-unread-context';
import { MESSAGE_TOAST_AUTO_DISMISS_MS } from '@/lib/message-toast.constants';
import { setInAppNotificationsEnabledPreference } from '@/lib/message-in-app-notify';

const peerMessage = {
  id: 'msg_1',
  conversationId: 'conv_1',
  senderId: 'user_peer',
  text: 'Hi',
  createdAt: '2026-06-06T12:00:00.000Z',
  status: 'SENT' as const,
};

function UnreadProbe() {
  const { totalUnread } = useConversationUnread();
  return <span data-testid="nav-total">{totalUnread}</span>;
}

describe('MessagingShellProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setInAppNotificationsEnabledPreference(true);
    getRealtimeMode.mockReturnValue('ws');
    getActiveConversationId.mockReturnValue(null);
    onMessageNewRef.current = null;
    fetchConversationsUnreadTotal.mockResolvedValue({ totalUnread: 1 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('shows toast on peer message.new', async () => {
    render(
      <MessagingShellProvider sessionUserId="user_me">
        <div>child</div>
      </MessagingShellProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByTestId('message-toast')).toBeTruthy();
      // Peer nicknames warm when conversations list reconciles; shell uses unread-total only.
      expect(screen.getByText(/Someone sent you a message/)).toBeTruthy();
    });
  });

  it('bumps nav total on peer message.new', async () => {
    render(
      <MessagingShellProvider sessionUserId="user_me">
        <UnreadProbe />
      </MessagingShellProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('nav-total').textContent).toBe('1');
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByTestId('nav-total').textContent).toBe('2');
    });
  });

  it('skips toast and nav bump when in-app notifications are disabled', async () => {
    setInAppNotificationsEnabledPreference(false);

    render(
      <MessagingShellProvider sessionUserId="user_me">
        <UnreadProbe />
      </MessagingShellProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    expect(screen.queryByTestId('message-toast')).toBeNull();
    expect(screen.getByTestId('nav-total').textContent).toBe('1');
  });

  it('skips toast and bump for own message', async () => {
    render(
      <MessagingShellProvider sessionUserId="user_me">
        <UnreadProbe />
      </MessagingShellProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.({
      ...peerMessage,
      senderId: 'user_me',
    });

    expect(screen.queryByTestId('message-toast')).toBeNull();
    expect(screen.getByTestId('nav-total').textContent).toBe('1');
  });

  it('skips toast and bump when active conversation matches', async () => {
    getActiveConversationId.mockReturnValue('conv_1');

    render(
      <MessagingShellProvider sessionUserId="user_me">
        <UnreadProbe />
      </MessagingShellProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    expect(screen.queryByTestId('message-toast')).toBeNull();
    expect(screen.getByTestId('nav-total').textContent).toBe('1');
  });

  it('navigates to conversation when toast is clicked', async () => {
    render(
      <MessagingShellProvider sessionUserId="user_me">
        <div>child</div>
      </MessagingShellProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByTestId('message-toast')).toBeTruthy();
    });

    fireEvent.click(screen.getByText(/Someone sent you a message/));

    expect(pushMock).toHaveBeenCalledWith('/dating/conversations/conv_1');
  });

  it('auto-dismisses toast after configured duration', async () => {
    render(
      <MessagingShellProvider sessionUserId="user_me">
        <div>child</div>
      </MessagingShellProvider>,
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

  it('does not wire handler when realtime mode is poll', () => {
    getRealtimeMode.mockReturnValue('poll');

    render(
      <MessagingShellProvider sessionUserId="user_me">
        <div>child</div>
      </MessagingShellProvider>,
    );

    expect(onMessageNewRef.current).toBeNull();
  });

  it('dismisses toast when dismiss button is clicked', async () => {
    render(
      <MessagingShellProvider sessionUserId="user_me">
        <div>child</div>
      </MessagingShellProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByTestId('message-toast')).toBeTruthy();
    });

    fireEvent.click(screen.getByLabelText('Dismiss'));

    expect(screen.queryByTestId('message-toast')).toBeNull();
  });

  it('shows Someone when sender is not in label cache', async () => {
    fetchConversationsUnreadTotal.mockResolvedValue({ totalUnread: 0 });

    render(
      <MessagingShellProvider sessionUserId="user_me">
        <div>child</div>
      </MessagingShellProvider>,
    );

    await waitFor(() => {
      expect(onMessageNewRef.current).toBeTruthy();
    });

    onMessageNewRef.current?.(peerMessage);

    await waitFor(() => {
      expect(screen.getByText(/Someone sent you a message/)).toBeTruthy();
    });
  });
});
