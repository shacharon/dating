/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor, act, fireEvent } from '@testing-library/react';

const {
  fetchMyConversations,
  getRealtimeMode,
  acquireMessagingSocket,
  releaseMessagingSocket,
  messageNewHandlerRef,
  setActiveConversationId,
  getActiveConversationId,
} = vi.hoisted(() => {
  const messageNewHandlerRef: {
    current: ((msg: unknown) => void) | null;
  } = { current: null };

  let activeId: string | null = null;

  return {
    fetchMyConversations: vi.fn(),
    getRealtimeMode: vi.fn(() => 'poll' as const),
    acquireMessagingSocket: vi.fn(() => ({
      on: vi.fn((event: string, fn: () => void) => {
        if (event === 'message.new') {
          messageNewHandlerRef.current = fn as (msg: unknown) => void;
        }
      }),
      off: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
    })),
    releaseMessagingSocket: vi.fn(),
    messageNewHandlerRef,
    setActiveConversationId: vi.fn((id: string | null) => {
      activeId = id;
    }),
    getActiveConversationId: vi.fn(() => activeId),
  };
});

vi.mock('@/lib/conversations-api', () => ({
  fetchMyConversations,
  conversationPhotoSrc: (url: string | null) => url,
}));

vi.mock('@/lib/realtime-mode', () => ({
  getRealtimeMode,
}));

vi.mock('@/lib/messaging-socket', () => ({
  acquireMessagingSocket,
  releaseMessagingSocket,
  MESSAGING_EVENT_MESSAGE_NEW: 'message.new',
}));

vi.mock('@/lib/conversation-focus', () => ({
  setActiveConversationId,
  getActiveConversationId,
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

const { reconcileFromList, refreshUnreadTotal, bumpFromMessage } = vi.hoisted(
  () => ({
    reconcileFromList: vi.fn(),
    refreshUnreadTotal: vi.fn(),
    bumpFromMessage: vi.fn(),
  }),
);

vi.mock('@/contexts/conversation-unread-context', () => ({
  useConversationUnread: () => ({
    totalUnread: 0,
    refresh: refreshUnreadTotal,
    reconcileFromList,
    bumpFromMessage,
  }),
}));

import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';
import { queryKeys } from '@/lib/query-keys';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';
import { focusManager } from '@tanstack/react-query';
import ConversationsPage from './conversations-page-client';

vi.mock('next/link', () => ({
  default ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

const otherUser = {
  id: 'user_cand_1',
  profileId: 'prof_cand_1',
  nickname: 'Noa',
  gender: 'FEMALE',
  ageYears: 32,
  locationLabel: 'Tel Aviv',
  photoUrl: '/api/v1/me/matches/prof_cand_1/photos/photo_1/file',
};

function renderPage(
  ui: React.ReactElement = <ConversationsPage />,
  client = createTestQueryClient(),
) {
  return render(
    <QueryClientTestProvider client={client}>{ui}</QueryClientTestProvider>,
  );
}

describe('ConversationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRealtimeMode.mockReturnValue('poll');
    messageNewHandlerRef.current = null;
    setActiveConversationId(null);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders empty state when there are no conversations', async () => {
    fetchMyConversations.mockResolvedValue({ conversations: [], nextCursor: null, hasMore: false });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversations-empty')).toBeTruthy();
    });
    expect(screen.getByText(/No conversations yet/)).toBeTruthy();
    unmount();
  });

  it('appends the next page when Load more is clicked', async () => {
    const otherB = { ...otherUser, id: 'user_cand_2', nickname: 'Dana' };
    fetchMyConversations.mockImplementation(async (opts?: { cursor?: string }) => {
      if (opts?.cursor === 'cursor_page1') {
        return {
          conversations: [
            {
              id: 'mutual_2',
              otherUser: otherB,
              matchedAt: '2026-05-30T12:00:00.000Z',
              unreadCount: 0,
            },
          ],
          nextCursor: null,
          hasMore: false,
        };
      }
      return {
        conversations: [
          {
            id: 'mutual_1',
            otherUser,
            matchedAt: '2026-05-31T12:00:00.000Z',
            unreadCount: 0,
          },
        ],
        nextCursor: 'cursor_page1',
        hasMore: true,
      };
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByText('Noa')).toBeTruthy();
    });
    expect(screen.getByTestId('conversations-load-more')).toBeTruthy();

    screen.getByTestId('conversations-load-more').click();

    await waitFor(() => {
      expect(screen.getByText('Dana')).toBeTruthy();
    });
    expect(fetchMyConversations).toHaveBeenCalledWith({
      cursor: 'cursor_page1',
    });
    expect(screen.queryByTestId('conversations-load-more')).toBeNull();
    unmount();
  });

  it('renders conversation rows with name and matched date', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversations-list')).toBeTruthy();
    });
    expect(screen.getByText('Noa')).toBeTruthy();
    expect(screen.getByText(/Matched/)).toBeTruthy();
    unmount();
  });

  it('links each row to conversation detail', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_abc',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { unmount, container } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversations-list')).toBeTruthy();
    });
    const link = container.querySelector(
      'a[href="/dating/conversations/mutual_abc"]',
    );
    expect(link).toBeTruthy();
    unmount();
  });

  it('renders unread badge when unreadCount is greater than zero', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 3,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversation-unread-badge')).toBeTruthy();
    });
    expect(screen.getByTestId('conversation-unread-badge').textContent).toBe(
      '3',
    );
    unmount();
  });

  it('does not render unread badge when unreadCount is zero', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversations-list')).toBeTruthy();
    });
    expect(screen.queryByTestId('conversation-unread-badge')).toBeNull();
    unmount();
  });

  it('exposes aria-label on unread badge', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 1,
          lastMessage: null,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversation-unread-badge')).toBeTruthy();
    });
    expect(
      screen.getByTestId('conversation-unread-badge').getAttribute('aria-label'),
    ).toBe('1 unread message');
    unmount();
  });

  it('shows No messages yet when lastMessage is null', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
          lastMessage: null,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversation-preview').textContent).toBe(
        'No messages yet',
      );
    });
    unmount();
  });

  it('shows You: prefix for own lastMessage and peer text without prefix', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_own',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
          lastMessage: {
            text: 'Thanks for sharing!',
            senderId: 'user_me',
            sentAt: '2026-08-01T12:00:00.000Z',
          },
        },
        {
          id: 'mutual_peer',
          otherUser: { ...otherUser, id: 'user_cand_2', nickname: 'Dana' },
          matchedAt: '2026-05-30T12:00:00.000Z',
          unreadCount: 2,
          lastMessage: {
            text: 'Hey there',
            senderId: 'user_cand_2',
            sentAt: '2026-08-01T11:00:00.000Z',
          },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getAllByTestId('conversation-preview').length).toBe(2);
    });
    const previews = screen.getAllByTestId('conversation-preview');
    expect(previews[0].textContent).toBe('You: Thanks for sharing!');
    expect(previews[1].textContent).toBe('Hey there');
    expect(
      screen.getByTestId('conversation-unread-badge').textContent,
    ).toBe('2');
    const labels = screen.getAllByTestId('conversation-primary-label');
    expect(labels[1].className).toContain('font-semibold');
    unmount();
  });

  it('does not open messaging socket in poll mode', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversations-list')).toBeTruthy();
    });
    expect(acquireMessagingSocket).not.toHaveBeenCalled();
    expect(messageNewHandlerRef.current).toBeNull();
    unmount();
  });

  it('refetches conversations on window focus when stale', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    const client = createTestQueryClient({
      defaultOptions: {
        queries: {
          staleTime: 0,
          retry: false,
          refetchOnWindowFocus: true,
        },
      },
    });

    const { unmount } = renderPage(<ConversationsPage />, client);

    await waitFor(() => {
      expect(fetchMyConversations.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
    const callsAfterMount = fetchMyConversations.mock.calls.length;

    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await waitFor(() => {
      expect(fetchMyConversations.mock.calls.length).toBeGreaterThan(
        callsAfterMount,
      );
    });
    unmount();
  });

  describe('realtime ws mode', () => {
    const peerMessage = {
      id: 'msg_peer_1',
      conversationId: 'mutual_live',
      senderId: 'user_cand_1',
      text: 'Hey',
      createdAt: '2026-06-03T12:00:00.000Z',
      status: 'SENT' as const,
    };

    beforeEach(() => {
      getRealtimeMode.mockReturnValue('ws');
    });

    it('increments unread badge live on peer message.new', async () => {
      fetchMyConversations.mockResolvedValue({
        conversations: [
          {
            id: 'mutual_live',
            otherUser,
            matchedAt: '2026-05-31T12:00:00.000Z',
            unreadCount: 0,
            lastMessage: null,
          },
        ],
      nextCursor: null,
      hasMore: false,
    });

      const { unmount } = renderPage();

      await waitFor(() => {
        expect(messageNewHandlerRef.current).toBeTruthy();
        expect(screen.getByTestId('conversations-list')).toBeTruthy();
      });

      messageNewHandlerRef.current!(peerMessage);

      await waitFor(() => {
        expect(screen.getByTestId('conversation-unread-badge')).toBeTruthy();
        expect(screen.getByTestId('conversation-unread-badge').textContent).toBe(
          '1',
        );
        expect(screen.getByTestId('conversation-preview').textContent).toBe(
          'Hey',
        );
      });
      unmount();
    });

    it('does not increment on own message.new', async () => {
      fetchMyConversations.mockResolvedValue({
        conversations: [
          {
            id: 'mutual_live',
            otherUser,
            matchedAt: '2026-05-31T12:00:00.000Z',
            unreadCount: 0,
            lastMessage: null,
          },
        ],
      nextCursor: null,
      hasMore: false,
    });

      const { unmount } = renderPage();

      await waitFor(() => {
        expect(messageNewHandlerRef.current).toBeTruthy();
        expect(screen.getByTestId('conversations-list')).toBeTruthy();
      });

      messageNewHandlerRef.current!({
        ...peerMessage,
        senderId: 'user_me',
        text: 'my outbound',
      });

      expect(screen.queryByTestId('conversation-unread-badge')).toBeNull();
      await waitFor(() => {
        expect(screen.getByTestId('conversation-preview').textContent).toBe(
          'You: my outbound',
        );
      });
      unmount();
    });

    it('moves bumped conversation to top of list', async () => {
      const otherUserB = {
        ...otherUser,
        id: 'user_cand_2',
        nickname: 'Dana',
      };
      fetchMyConversations.mockResolvedValue({
        conversations: [
          {
            id: 'mutual_top',
            otherUser,
            matchedAt: '2026-06-02T12:00:00.000Z',
            unreadCount: 0,
          },
          {
            id: 'mutual_live',
            otherUser: otherUserB,
            matchedAt: '2026-06-01T12:00:00.000Z',
            unreadCount: 0,
          },
        ],
      nextCursor: null,
      hasMore: false,
    });

      const { unmount, container } = renderPage();

      await waitFor(() => {
        expect(messageNewHandlerRef.current).toBeTruthy();
        expect(screen.getByTestId('conversations-list')).toBeTruthy();
      });

      const hrefsBefore = [
        ...container.querySelectorAll('a[href^="/dating/conversations/"]'),
      ].map((el) => el.getAttribute('href'));
      expect(hrefsBefore[0]).toBe('/dating/conversations/mutual_top');

      messageNewHandlerRef.current!(peerMessage);

      await waitFor(() => {
        const hrefsAfter = [
          ...container.querySelectorAll('a[href^="/dating/conversations/"]'),
        ].map((el) => el.getAttribute('href'));
        expect(hrefsAfter[0]).toBe('/dating/conversations/mutual_live');
        const liveLink = container.querySelector(
          'a[href="/dating/conversations/mutual_live"]',
        );
        expect(
          liveLink?.querySelector('[data-testid="conversation-unread-badge"]')
            ?.textContent,
        ).toBe('1');
      });
      unmount();
    });

    it('does not increment when active conversation matches', async () => {
      getActiveConversationId.mockImplementation(() => 'mutual_live');
      fetchMyConversations.mockResolvedValue({
        conversations: [
          {
            id: 'mutual_live',
            otherUser,
            matchedAt: '2026-05-31T12:00:00.000Z',
            unreadCount: 0,
            lastMessage: null,
          },
        ],
      nextCursor: null,
      hasMore: false,
    });

      const { unmount } = renderPage();

      await waitFor(() => {
        expect(messageNewHandlerRef.current).toBeTruthy();
        expect(screen.getByTestId('conversations-list')).toBeTruthy();
      });

      messageNewHandlerRef.current!(peerMessage);

      const liveLink = screen.getByRole('link', { name: /Noa/i });
      expect(
        liveLink.querySelector('[data-testid="conversation-unread-badge"]'),
      ).toBeNull();
      await waitFor(() => {
        expect(screen.getByTestId('conversation-preview').textContent).toBe(
          'Hey',
        );
      });
      unmount();
    });

    it('reconciles unread count on refetch after optimistic bump', async () => {
      fetchMyConversations
        .mockResolvedValueOnce({
          conversations: [
            {
              id: 'mutual_live',
              otherUser,
              matchedAt: '2026-05-31T12:00:00.000Z',
              unreadCount: 0,
            },
          ],
          nextCursor: null,
          hasMore: false,
        })
        .mockResolvedValue({
          conversations: [
            {
              id: 'mutual_live',
              otherUser,
              matchedAt: '2026-05-31T12:00:00.000Z',
              unreadCount: 0,
            },
          ],
          nextCursor: null,
          hasMore: false,
        });

      const client = createTestQueryClient({
        defaultOptions: {
          queries: {
            staleTime: 0,
            retry: false,
            refetchOnWindowFocus: true,
          },
        },
      });

      const { unmount } = renderPage(<ConversationsPage />, client);

      await waitFor(() => {
        expect(messageNewHandlerRef.current).toBeTruthy();
        expect(screen.getByTestId('conversations-list')).toBeTruthy();
      });

      messageNewHandlerRef.current!(peerMessage);

      await waitFor(() => {
        expect(
          screen.getByRole('link', { name: /Noa/i }).querySelector(
            '[data-testid="conversation-unread-badge"]',
          )?.textContent,
        ).toBe('1');
      });

      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await client.invalidateQueries({
        queryKey: queryKeys.me.conversations.list,
      });

      await waitFor(() => {
        expect(
          screen
            .getByRole('link', { name: /Noa/i })
            .querySelector('[data-testid="conversation-unread-badge"]'),
        ).toBeNull();
      });
      unmount();
    });
  });
});

describe('ConversationsPage (i18n)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getRealtimeMode.mockReturnValue('poll');
    messageNewHandlerRef.current = null;
    setActiveConversationId(null);
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders Hebrew list copy when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    fetchMyConversations.mockResolvedValue({ conversations: [], nextCursor: null, hasMore: false });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: heCopy.conversations.list.title,
        }),
      ).toBeTruthy();
      expect(screen.getByText(heCopy.conversations.list.subtitle)).toBeTruthy();
      expect(screen.getByText(heCopy.conversations.list.emptyTitle)).toBeTruthy();
    });
  });

  it('shows Hebrew empty preview when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
          lastMessage: null,
        },
      ],
      nextCursor: null,
      hasMore: false,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Noa')).toBeTruthy();
      expect(
        screen.getByTestId('conversation-preview').textContent,
      ).toBe(heCopy.conversations.list.noMessagesYet);
    });
  });
});

describe('ConversationsPage (list controls)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    getRealtimeMode.mockReturnValue('poll');
    messageNewHandlerRef.current = null;
    setActiveConversationId(null);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.useRealTimers();
  });

  const twoRows = {
    conversations: [
      {
        id: 'mutual_noa',
        otherUser,
        matchedAt: '2026-05-31T12:00:00.000Z',
        unreadCount: 2,
        lastMessage: {
          text: 'hey',
          senderId: 'user_cand_1',
          sentAt: '2026-08-01T10:00:00.000Z',
        },
      },
      {
        id: 'mutual_dana',
        otherUser: {
          ...otherUser,
          id: 'user_cand_2',
          nickname: 'Dana',
        },
        matchedAt: '2026-05-30T12:00:00.000Z',
        unreadCount: 0,
        lastMessage: {
          text: 'hi',
          senderId: 'user_me',
          sentAt: '2026-07-01T10:00:00.000Z',
        },
      },
    ],
    nextCursor: null,
    hasMore: false,
  };

  it('filters by search after debounce and clears search', async () => {
    fetchMyConversations.mockResolvedValue(twoRows);
    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByText('Noa')).toBeTruthy();
      expect(screen.getByText('Dana')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('conversation-list-search'), {
      target: { value: 'dan' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(screen.queryByText('Noa')).toBeNull();
      expect(screen.getByText('Dana')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('conversation-list-search-clear'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Noa')).toBeTruthy();
      expect(screen.getByText('Dana')).toBeTruthy();
    });
    unmount();
  });

  it('filters unread and shows filtered-empty copy', async () => {
    fetchMyConversations.mockResolvedValue(twoRows);
    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversation-list-filter')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('conversation-list-filter'), {
      target: { value: 'unread' },
    });

    await waitFor(() => {
      expect(screen.getByText('Noa')).toBeTruthy();
      expect(screen.queryByText('Dana')).toBeNull();
    });

    fireEvent.change(screen.getByTestId('conversation-list-search'), {
      target: { value: 'zzz' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId('conversations-filtered-empty')).toBeTruthy();
      expect(screen.getByText(/No conversations match/)).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('conversations-clear-filters'));

    await waitFor(() => {
      expect(screen.queryByTestId('conversations-filtered-empty')).toBeNull();
      expect(screen.getByText('Noa')).toBeTruthy();
      expect(screen.getByText('Dana')).toBeTruthy();
    });
    unmount();
  });

  it('sorts A–Z by primary label', async () => {
    fetchMyConversations.mockResolvedValue(twoRows);
    const { unmount } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('conversations-list')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('conversation-list-sort'), {
      target: { value: 'alphabetical' },
    });

    await waitFor(() => {
      const labels = screen
        .getAllByTestId('conversation-primary-label')
        .map((el) => el.textContent);
      expect(labels).toEqual(['Dana', 'Noa']);
    });
    unmount();
  });

  it('restores controls from sessionStorage', async () => {
    sessionStorage.setItem(
      'dating.conversations.listControls.v1',
      JSON.stringify({
        searchQuery: 'Dana',
        filterType: 'all',
        sortBy: 'alphabetical',
      }),
    );
    fetchMyConversations.mockResolvedValue(twoRows);
    const { unmount } = renderPage();

    await waitFor(() => {
      expect(
        (screen.getByTestId('conversation-list-search') as HTMLInputElement)
          .value,
      ).toBe('Dana');
      expect(screen.getByText('Dana')).toBeTruthy();
      expect(screen.queryByText('Noa')).toBeNull();
    });
    unmount();
  });
});
