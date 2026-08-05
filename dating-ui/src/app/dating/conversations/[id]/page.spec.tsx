/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, fireEvent, act } from '@testing-library/react';

const {
  fetchMyConversationById,
  fetchConversationMessages,
  markConversationAsRead,
  sendConversationMessage,
  unmatchMyConversation,
  mockPush,
  getRealtimeMode,
  acquireMessagingSocket,
  releaseMessagingSocket,
  messageNewHandlerRef,
  connectHandlerRef,
  disconnectHandlerRef,
} = vi.hoisted(() => {
  const messageNewHandlerRef: {
    current: ((msg: unknown) => void) | null;
  } = { current: null };
  const connectHandlerRef: { current: (() => void) | null } = { current: null };
  const disconnectHandlerRef: {
    current: ((reason: string) => void) | null;
  } = {
    current: null,
  };

  const acquireMessagingSocket = vi.fn(() => ({
    active: true,
    connected: false,
    on: vi.fn((event: string, fn: () => void) => {
      if (event === 'message.new') {
        messageNewHandlerRef.current = fn as (msg: unknown) => void;
      }
      if (event === 'connect') {
        connectHandlerRef.current = fn;
      }
      if (event === 'disconnect') {
        disconnectHandlerRef.current = fn as (reason: string) => void;
      }
    }),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));

  return {
    fetchMyConversationById: vi.fn(),
    fetchConversationMessages: vi.fn(),
    markConversationAsRead: vi.fn(),
    sendConversationMessage: vi.fn(),
    unmatchMyConversation: vi.fn(),
    mockPush: vi.fn(),
    getRealtimeMode: vi.fn(() => 'poll' as const),
    acquireMessagingSocket,
    releaseMessagingSocket: vi.fn(),
    messageNewHandlerRef,
    connectHandlerRef,
    disconnectHandlerRef,
  };
});

vi.mock('@/lib/conversations-api', () => ({
  fetchMyConversationById,
  fetchConversationMessages,
  markConversationAsRead,
  sendConversationMessage,
  unmatchMyConversation,
  conversationPhotoSrc: (url: string | null) => url,
}));

vi.mock('@/lib/realtime-mode', () => ({
  getRealtimeMode,
}));

const { setActiveConversationId } = vi.hoisted(() => ({
  setActiveConversationId: vi.fn(),
}));

vi.mock('@/lib/conversation-focus', () => ({
  setActiveConversationId,
}));

vi.mock('@/lib/messaging-socket', () => ({
  acquireMessagingSocket,
  releaseMessagingSocket,
  MESSAGING_EVENT_MESSAGE_NEW: 'message.new',
  MESSAGING_EVENT_CONVERSATION_SUBSCRIBE: 'conversation.subscribe',
  MESSAGING_EVENT_CONVERSATION_UNSUBSCRIBE: 'conversation.unsubscribe',
  MESSAGING_WS_NAMESPACE: '/ws/messaging',
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'user_me' },
    status: 'authenticated',
    refresh: vi.fn(),
    signInWithGoogleIdToken: vi.fn(),
    logout: vi.fn(),
    lastError: null,
    clearLastError: vi.fn(),
  }),
}));

const { refreshNavUnread } = vi.hoisted(() => ({
  refreshNavUnread: vi.fn(),
}));

vi.mock('@/contexts/conversation-unread-context', () => ({
  useConversationUnread: () => ({
    totalUnread: 0,
    refresh: refreshNavUnread,
    reconcileFromList: vi.fn(),
    bumpFromMessage: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'mutual_abc' }),
  useRouter: () => ({ push: mockPush, replace: mockPush }),
  useSearchParams: () => new URLSearchParams(),
}));

import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';
import ConversationDetailPage from './page';

vi.mock('next/link', () => ({
  default ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

const detail = {
  id: 'mutual_abc',
  otherUser: {
    id: 'user_cand_1',
    profileId: 'prof_cand_1',
    nickname: 'Noa',
    gender: 'FEMALE',
    ageYears: 32,
    locationLabel: 'Tel Aviv',
    photoUrl: '/api/v1/me/matches/prof_cand_1/photos/photo_1/file',
  },
  matchedAt: '2026-05-31T12:00:00.000Z',
  status: 'ACTIVE' as const,
  lastReadAt: null,
};

describe('ConversationDetailPage', () => {
  const sentMessage = {
    id: 'msg_1',
    conversationId: 'mutual_abc',
    senderId: 'user_me',
    text: 'Hello there',
    createdAt: '2026-05-31T16:00:00.000Z',
    status: 'SENT' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    getRealtimeMode.mockReturnValue('poll');
    messageNewHandlerRef.current = null;
    connectHandlerRef.current = null;
    disconnectHandlerRef.current = null;
    fetchMyConversationById.mockResolvedValue(detail);
    fetchConversationMessages.mockResolvedValue({
      messages: [],
      pagination: { hasMore: false, nextCursor: null },
    });
    markConversationAsRead.mockResolvedValue({
      lastReadAt: '2026-06-01T18:00:00.000Z',
    });
    unmatchMyConversation.mockResolvedValue(undefined);
    sendConversationMessage.mockResolvedValue(sentMessage);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('sets active conversation id on mount and clears on unmount', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(setActiveConversationId).toHaveBeenCalledWith('mutual_abc');
    });

    unmount();

    expect(setActiveConversationId).toHaveBeenCalledWith(null);
  });

  it('renders match card with name and matched date', async () => {
    fetchMyConversationById.mockResolvedValue(detail);

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-match-card')).toBeTruthy();
    });
    expect(screen.getByText('Noa')).toBeTruthy();
    expect(screen.getByTestId('conversation-matched-date')).toBeTruthy();
    expect(screen.getByText(/Matched on/)).toBeTruthy();
    unmount();
  });

  it('renders enabled composer and empty messages state', async () => {
    fetchMyConversationById.mockResolvedValue(detail);

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-messaging')).toBeTruthy();
    });
    await waitFor(() => {
      expect(screen.getByTestId('conversation-messages-empty')).toBeTruthy();
    });
    expect(screen.getByText(/No messages yet/)).toBeTruthy();
    expect(
      (screen.getByLabelText('Message') as HTMLTextAreaElement).disabled,
    ).toBe(false);
    expect(screen.getByTestId('conversation-send-button')).toBeTruthy();
    unmount();
  });

  it('loads messages on mount', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(fetchConversationMessages).toHaveBeenCalledWith('mutual_abc');
    });
    unmount();
  });

  it('calls markConversationAsRead after conversation shell loads', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(markConversationAsRead).toHaveBeenCalledWith('mutual_abc');
    });
    unmount();
  });

  it('refreshes nav unread after successful mark-as-read', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(markConversationAsRead).toHaveBeenCalledWith('mutual_abc');
      expect(refreshNavUnread).toHaveBeenCalled();
    });
    unmount();
  });

  it('calls markConversationAsRead again when tab becomes visible after debounce', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(0);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(markConversationAsRead).toHaveBeenCalled();
    });
    const callsAfterMount = markConversationAsRead.mock.calls.length;

    document.dispatchEvent(new Event('visibilitychange'));
    expect(markConversationAsRead.mock.calls.length).toBe(callsAfterMount);

    nowSpy.mockReturnValue(16_000);
    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(markConversationAsRead.mock.calls.length).toBeGreaterThan(
        callsAfterMount,
      );
    });

    unmount();
  });

  it('skips mark-as-read on visibility within 15s debounce', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(markConversationAsRead).toHaveBeenCalled();
    });
    const callsAfterMount = markConversationAsRead.mock.calls.length;

    document.dispatchEvent(new Event('visibilitychange'));
    expect(markConversationAsRead.mock.calls.length).toBe(callsAfterMount);

    unmount();
  });

  it('does not show error banner when mark-as-read fails', async () => {
    markConversationAsRead.mockRejectedValue(new Error('Mark read failed'));

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(markConversationAsRead).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('conversation-error')).toBeNull();
    expect(screen.queryByText('Mark read failed')).toBeNull();
    unmount();
  });

  it('renders left and right bubbles based on sender', async () => {
    const recent = new Date().toISOString();
    fetchConversationMessages.mockResolvedValue({
      messages: [
        {
          id: 'msg_mine',
          conversationId: 'mutual_abc',
          senderId: 'user_me',
          text: 'My message',
          createdAt: recent,
          status: 'SENT',
        },
        {
          id: 'msg_other',
          conversationId: 'mutual_abc',
          senderId: 'user_cand_1',
          text: 'Their message',
          createdAt: recent,
          status: 'SENT',
        },
      ],
      pagination: { hasMore: false, nextCursor: null },
    });

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('My message')).toBeTruthy();
      expect(screen.getByText('Their message')).toBeTruthy();
    });
    expect(
      screen.getByText('My message').closest('[data-sender="me"]'),
    ).toBeTruthy();
    expect(
      screen.getByText('Their message').closest('[data-sender="other"]'),
    ).toBeTruthy();
    unmount();
  });

  it('shows message timestamp', async () => {
    const recent = new Date().toISOString();
    fetchConversationMessages.mockResolvedValue({
      messages: [
        {
          id: 'msg_mine',
          conversationId: 'mutual_abc',
          senderId: 'user_me',
          text: 'Timed message',
          createdAt: recent,
          status: 'SENT',
        },
      ],
      pagination: { hasMore: false, nextCursor: null },
    });

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-message-time')).toBeTruthy();
    });
    expect(screen.getByText('Just now')).toBeTruthy();
    unmount();
  });

  it('shows always-visible timestamps for sent and received bubbles', async () => {
    const recent = new Date().toISOString();
    fetchConversationMessages.mockResolvedValue({
      messages: [
        {
          id: 'msg_mine',
          conversationId: 'mutual_abc',
          senderId: 'user_me',
          text: 'Mine timed',
          createdAt: recent,
          status: 'SENT',
        },
        {
          id: 'msg_other',
          conversationId: 'mutual_abc',
          senderId: 'user_cand_1',
          text: 'Theirs timed',
          createdAt: recent,
          status: 'SENT',
        },
      ],
      pagination: { hasMore: false, nextCursor: null },
    });

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Mine timed')).toBeTruthy();
      expect(screen.getByText('Theirs timed')).toBeTruthy();
    });

    const times = screen.getAllByTestId('conversation-message-time');
    expect(times).toHaveLength(2);
    for (const el of times) {
      expect(el.textContent?.trim().length).toBeGreaterThan(0);
      expect(el.className).toMatch(/text-zinc-400/);
      expect(el.className).not.toMatch(/group-hover|opacity-0|invisible/);
    }
    expect(
      screen.getByText('Mine timed').closest('[data-sender="me"]')
        ?.querySelector('[data-testid="conversation-message-time"]'),
    ).toBeTruthy();
    expect(
      screen.getByText('Theirs timed').closest('[data-sender="other"]')
        ?.querySelector('[data-testid="conversation-message-time"]'),
    ).toBeTruthy();
    unmount();
  });

  it('shows load earlier button and fetches with before cursor', async () => {
    const recent = new Date().toISOString();
    fetchConversationMessages
      .mockResolvedValueOnce({
        messages: [
          {
            id: 'msg_new',
            conversationId: 'mutual_abc',
            senderId: 'user_me',
            text: 'Recent',
            createdAt: recent,
            status: 'SENT',
          },
        ],
        pagination: { hasMore: true, nextCursor: 'msg_old' },
      })
      .mockResolvedValueOnce({
        messages: [
          {
            id: 'msg_old',
            conversationId: 'mutual_abc',
            senderId: 'user_cand_1',
            text: 'Older',
            createdAt: '2026-05-30T10:00:00.000Z',
            status: 'SENT',
          },
        ],
        pagination: { hasMore: false, nextCursor: null },
      });

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-load-earlier')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('conversation-load-earlier'));

    await waitFor(() => {
      expect(fetchConversationMessages).toHaveBeenCalledWith('mutual_abc', {
        before: 'msg_old',
      });
      expect(screen.getByText('Older')).toBeTruthy();
      expect(screen.getByText('Recent')).toBeTruthy();
    });
    unmount();
  });

  it('shows messages error when history fetch fails', async () => {
    fetchConversationMessages.mockRejectedValue(
      new Error('Failed to load messages'),
    );

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-messages-error')).toBeTruthy();
    });
    expect(screen.getByText('Failed to load messages')).toBeTruthy();
    unmount();
  });

  it('does not duplicate message when send returns existing id', async () => {
    fetchConversationMessages.mockResolvedValue({
      messages: [sentMessage],
      pagination: { hasMore: false, nextCursor: null },
    });

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Hello there')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(screen.getByTestId('conversation-send-button'));

    await waitFor(() => {
      expect(sendConversationMessage).toHaveBeenCalled();
      expect(
        screen.getAllByTestId('conversation-message-bubble'),
      ).toHaveLength(1);
    });
    unmount();
  });

  it('shows character count as draft length / 2000', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-char-count')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'a'.repeat(245) },
    });

    expect(screen.getByTestId('conversation-char-count').textContent).toBe(
      '245 / 2000',
    );
    unmount();
  });

  it('shows red character count and disables Send when draft exceeds 2000', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Message')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'x'.repeat(2001) },
    });

    const counter = screen.getByTestId('conversation-char-count');
    expect(counter.textContent).toBe('2001 / 2000');
    expect(counter.className).toMatch(/text-red-600/);
    expect(
      (screen.getByTestId('conversation-send-button') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    unmount();
  });

  it('shows rate-limit error when send returns 429', async () => {
    sendConversationMessage.mockRejectedValue(
      new Error('Too many messages. Please wait.'),
    );

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Message')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hi' },
    });
    fireEvent.click(screen.getByTestId('conversation-send-button'));

    await waitFor(() => {
      expect(screen.getByTestId('conversation-send-error')).toBeTruthy();
      expect(
        screen.getByText('Too many messages. Please wait.'),
      ).toBeTruthy();
    });
    unmount();
  });

  it('shows moderation alert when send is rejected for content policy', async () => {
    const { ContentModerationApiError } = await import(
      '@/lib/content-moderation-error'
    );
    sendConversationMessage.mockRejectedValue(
      new ContentModerationApiError(
        'message_content_moderation_failed',
        {
          category: 'sexual',
          flaggedText: 'bad phrase',
          reason: 'Direct sexual solicitation',
          suggestion: 'Keep messages respectful.',
          muted: '1 hour',
        },
      ),
    );

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Message')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'bad phrase' },
    });
    fireEvent.click(screen.getByTestId('conversation-send-button'));

    await waitFor(() => {
      expect(
        screen.getByTestId('content-moderation-error-alert'),
      ).toBeTruthy();
    });
    const alert = screen.getByTestId('content-moderation-error-alert');
    expect(alert.textContent).toContain('bad phrase');
    expect(alert.textContent).toContain('Direct sexual solicitation');
    expect(alert.textContent).toContain('Keep messages respectful.');
    expect(alert.textContent).toContain('1 hour');
    unmount();
  });

  it('disables Send when draft is empty', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-send-button')).toBeTruthy();
    });

    expect(
      (screen.getByTestId('conversation-send-button') as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    unmount();
  });

  it('calls sendConversationMessage and shows message bubble on Send', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Message')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(screen.getByTestId('conversation-send-button'));

    await waitFor(() => {
      expect(sendConversationMessage).toHaveBeenCalledWith(
        'mutual_abc',
        'Hello there',
      );
      expect(screen.getByText('Hello there')).toBeTruthy();
      expect(screen.queryByTestId('conversation-messages-empty')).toBeNull();
    });
    expect(
      (screen.getByLabelText('Message') as HTMLTextAreaElement).value,
    ).toBe('');
    unmount();
  });

  it('shows send error when API fails', async () => {
    sendConversationMessage.mockRejectedValue(new Error('Network error'));

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Message')).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText('Message'), {
      target: { value: 'Oops' },
    });
    fireEvent.click(screen.getByTestId('conversation-send-button'));

    await waitFor(() => {
      expect(screen.getByTestId('conversation-send-error')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
    unmount();
  });

  it('renders back link to conversation list', async () => {
    fetchMyConversationById.mockResolvedValue(detail);

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-back-link')).toBeTruthy();
    });
    expect(
      screen.getByTestId('conversation-back-link').getAttribute('href'),
    ).toBe('/dating/conversations');
    unmount();
  });

  it('shows error when conversation is not found', async () => {
    fetchMyConversationById.mockRejectedValue(
      new Error('Conversation not found.'),
    );

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-error')).toBeTruthy();
    });
    expect(screen.getByText(/Conversation not found/)).toBeTruthy();
    unmount();
  });

  it('shows Unmatch button on loaded detail', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^unmatch$/i })).toBeTruthy();
    });
    unmount();
  });

  it('shows confirmation with other user name when Unmatch is clicked', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^unmatch$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^unmatch$/i }));

    expect(screen.getByTestId('conversation-unmatch-confirm')).toBeTruthy();
    expect(screen.getByText(/Unmatch Noa\?/)).toBeTruthy();
    expect(unmatchMyConversation).not.toHaveBeenCalled();
    unmount();
  });

  it('opens report dialog from overflow menu', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-report-open')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('conversation-report-open'));
    await waitFor(() => {
      expect(screen.getByTestId('report-user-dialog')).toBeTruthy();
    });
    unmount();
  });

  it('cancels unmatch without calling API', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^unmatch$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^unmatch$/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByTestId('conversation-unmatch-confirm')).toBeNull();
    expect(unmatchMyConversation).not.toHaveBeenCalled();
    unmount();
  });

  it('calls unmatchMyConversation and redirects on confirm', async () => {
    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^unmatch$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^unmatch$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^unmatch$/i }));

    await waitFor(() => {
      expect(unmatchMyConversation).toHaveBeenCalledWith('mutual_abc');
      expect(mockPush).toHaveBeenCalledWith('/dating/conversations');
    });
    unmount();
  });

  it('shows error when unmatch fails', async () => {
    unmatchMyConversation.mockRejectedValue(new Error('Network error'));

    const { unmount } = render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^unmatch$/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /^unmatch$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^unmatch$/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('Network error')).toBeTruthy();
    });
    expect(mockPush).not.toHaveBeenCalled();
    unmount();
  });

  describe('realtime ws mode', () => {
    const otherMessage = {
      id: 'msg_other_1',
      conversationId: 'mutual_abc',
      senderId: 'user_cand_1',
      text: 'Hey from socket',
      createdAt: '2026-05-31T17:00:00.000Z',
      status: 'SENT' as const,
    };

    beforeEach(() => {
    getRealtimeMode.mockReturnValue('ws');
    connectHandlerRef.current = null;
    disconnectHandlerRef.current = null;
  });

    it('appends a bubble when message.new is received', async () => {
      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(acquireMessagingSocket).toHaveBeenCalled();
        expect(messageNewHandlerRef.current).toBeTruthy();
      });

      messageNewHandlerRef.current!(otherMessage);

      await waitFor(() => {
        expect(screen.getByText('Hey from socket')).toBeTruthy();
      });
      unmount();
    });

    it('does not schedule polling interval when mode is ws', async () => {
      const intervalSpy = vi.spyOn(global, 'setInterval');

      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-messaging')).toBeTruthy();
      });

      const pollIntervals = intervalSpy.mock.calls.filter(
        ([delay]) => delay === 3000,
      );
      expect(pollIntervals).toHaveLength(0);
      intervalSpy.mockRestore();
      unmount();
    });

    it('ignores message.new for a different conversationId', async () => {
      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(messageNewHandlerRef.current).toBeTruthy();
      });

      messageNewHandlerRef.current!({
        ...otherMessage,
        id: 'msg_wrong_conv',
        conversationId: 'mutual_other',
        text: 'Wrong thread',
      });

      expect(screen.queryByText('Wrong thread')).toBeNull();
      unmount();
    });

    it('shows reconnecting banner after disconnect', async () => {
      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(connectHandlerRef.current).toBeTruthy();
      });

      await act(async () => {
        connectHandlerRef.current!();
      });
      await act(async () => {
        disconnectHandlerRef.current!('ping timeout');
      });

      expect(screen.getByTestId('conversation-reconnecting')).toBeTruthy();
      expect(screen.getByText('Reconnecting…')).toBeTruthy();
      unmount();
    });

    it('clears reconnecting banner and runs catch-up on connect', async () => {
      fetchConversationMessages
        .mockResolvedValueOnce({
          messages: [sentMessage],
          pagination: { hasMore: false, nextCursor: null },
        })
        .mockResolvedValueOnce({
          messages: [
            {
              id: 'msg_missed',
              conversationId: 'mutual_abc',
              senderId: 'user_cand_1',
              text: 'Missed while offline',
              createdAt: '2026-05-31T17:30:00.000Z',
              status: 'SENT',
            },
          ],
          pagination: { hasMore: false, nextCursor: null },
        });

      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(connectHandlerRef.current).toBeTruthy();
      });

      await act(async () => {
        connectHandlerRef.current!();
      });
      await act(async () => {
        disconnectHandlerRef.current!('ping timeout');
      });
      expect(screen.getByTestId('conversation-reconnecting')).toBeTruthy();

      await act(async () => {
        connectHandlerRef.current!();
      });

      await waitFor(() => {
        expect(screen.queryByTestId('conversation-reconnecting')).toBeNull();
        expect(screen.getByText('Missed while offline')).toBeTruthy();
      });

      expect(fetchConversationMessages).toHaveBeenCalledWith('mutual_abc', {
        after: 'msg_1',
        limit: 100,
      });
      unmount();
    });

    it('does not duplicate message when catch-up returns existing id', async () => {
      fetchConversationMessages
        .mockResolvedValueOnce({
          messages: [sentMessage],
          pagination: { hasMore: false, nextCursor: null },
        })
        .mockResolvedValueOnce({
          messages: [sentMessage],
          pagination: { hasMore: false, nextCursor: null },
        });

      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(connectHandlerRef.current).toBeTruthy();
      });

      await act(async () => {
        connectHandlerRef.current!();
      });

      await waitFor(() => {
        const bubbles = screen.getAllByTestId('conversation-message-bubble');
        expect(bubbles).toHaveLength(1);
      });
      unmount();
    });

    it('releases shared socket on unmount', async () => {
      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(acquireMessagingSocket).toHaveBeenCalled();
      });

      unmount();
      expect(releaseMessagingSocket).toHaveBeenCalled();
    });

    it('does not duplicate self-sent message when echo has same id', async () => {
      fetchConversationMessages.mockResolvedValue({
        messages: [],
        pagination: { hasMore: false, nextCursor: null },
      });

      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(screen.getByLabelText('Message')).toBeTruthy();
      });

      fireEvent.change(screen.getByLabelText('Message'), {
        target: { value: 'Hello there' },
      });
      fireEvent.click(screen.getByTestId('conversation-send-button'));

      await waitFor(() => {
        expect(screen.getByText('Hello there')).toBeTruthy();
      });

      expect(messageNewHandlerRef.current).toBeTruthy();
      messageNewHandlerRef.current!(sentMessage);

      await waitFor(() => {
        expect(
          screen.getAllByTestId('conversation-message-bubble'),
        ).toHaveLength(1);
      });
      unmount();
    });
  });

  describe('realtime poll mode', () => {
    beforeEach(() => {
      getRealtimeMode.mockReturnValue('poll');
    });

    it('does not show reconnecting banner in poll mode', async () => {
      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-messaging')).toBeTruthy();
      });

      if (disconnectHandlerRef.current) {
        disconnectHandlerRef.current('ping timeout');
      }

      expect(screen.queryByTestId('conversation-reconnecting')).toBeNull();
      unmount();
    });

    it('polls with after cursor on interval', async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });

      const intervalSpy = vi.spyOn(global, 'setInterval');

      fetchConversationMessages.mockResolvedValue({
        messages: [sentMessage],
        pagination: { hasMore: false, nextCursor: null },
      });

      const { unmount } = render(<ConversationDetailPage />);

      await waitFor(() => {
        expect(
          screen.getByTestId('conversation-message-list').textContent,
        ).toContain('Hello there');
      });

      const pollCall = intervalSpy.mock.calls.find(
        ([, delay]) => delay === 3000,
      );
      expect(pollCall).toBeTruthy();
      const pollTick = pollCall![0] as () => void | Promise<void>;

      fetchConversationMessages.mockClear();
      fetchConversationMessages.mockResolvedValue({
        messages: [],
        pagination: { hasMore: false, nextCursor: null },
      });

      await Promise.resolve(pollTick());

      await waitFor(() => {
        expect(fetchConversationMessages).toHaveBeenCalledWith('mutual_abc', {
          after: 'msg_1',
          limit: 100,
        });
      });

      intervalSpy.mockRestore();
      unmount();
    });
  });
});

describe('ConversationDetailPage (i18n)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    localStorage.clear();
    getRealtimeMode.mockReturnValue('poll');
    fetchMyConversationById.mockResolvedValue(detail);
    fetchConversationMessages.mockResolvedValue({
      messages: [],
      pagination: { hasMore: false, nextCursor: null },
    });
    markConversationAsRead.mockResolvedValue({
      lastReadAt: '2026-06-01T18:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders Hebrew messaging chrome when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: heCopy.conversations.detail.send,
        }),
      ).toBeTruthy();
      expect(
        screen.getByLabelText(heCopy.conversations.detail.messageLabel),
      ).toBeTruthy();
      expect(
        screen.getByPlaceholderText(
          heCopy.conversations.detail.messagePlaceholder,
        ),
      ).toBeTruthy();
    });
  });

  it('still renders message bodies in English when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    fetchConversationMessages.mockResolvedValue({
      messages: [
        {
          id: 'msg_1',
          conversationId: 'mutual_abc',
          senderId: 'user_cand_1',
          text: 'Thanks for saying hi!',
          createdAt: '2026-05-31T16:00:00.000Z',
          status: 'SENT' as const,
        },
      ],
      pagination: { hasMore: false, nextCursor: null },
    });

    render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Thanks for saying hi!')).toBeTruthy();
    });
  });

  it('shows localized loadMessagesFailed when messages fetch rejects non-Error', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    fetchConversationMessages.mockRejectedValue('network');

    render(<ConversationDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText(heCopy.conversations.detail.loadMessagesFailed),
      ).toBeTruthy();
    });
  });
});
