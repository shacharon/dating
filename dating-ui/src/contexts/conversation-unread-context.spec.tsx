/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchConversationsUnreadTotal } = vi.hoisted(() => ({
  fetchConversationsUnreadTotal: vi.fn(),
}));

vi.mock('@/lib/conversations-api', () => ({
  fetchConversationsUnreadTotal,
}));

import {
  ConversationUnreadProvider,
  useConversationUnread,
} from '@/contexts/conversation-unread-context';

function Probe() {
  const { totalUnread, reconcileFromList, bumpFromMessage, refresh } =
    useConversationUnread();
  return (
    <div>
      <span data-testid="total">{totalUnread}</span>
      <button
        type="button"
        onClick={() =>
          reconcileFromList([
            {
              id: 'conv_1',
              matchedAt: '2026-06-01T10:00:00.000Z',
              unreadCount: 2,
              lastMessage: null,
              otherUser: {
                id: 'user_peer',
                profileId: 'prof_peer',
                nickname: 'Noa',
                gender: null,
                ageYears: null,
                locationLabel: null,
                photoUrl: null,
              },
            },
          ])
        }
      >
        reconcile
      </button>
      <button type="button" onClick={() => bumpFromMessage('conv_1')}>
        bump
      </button>
      <button type="button" onClick={() => void refresh()}>
        refresh
      </button>
    </div>
  );
}

function renderUnread(ui: React.ReactElement, client = createTestQueryClient()) {
  return render(
    <QueryClientTestProvider client={client}>{ui}</QueryClientTestProvider>,
  );
}

describe('ConversationUnreadProvider', () => {
  beforeEach(() => {
    fetchConversationsUnreadTotal.mockResolvedValue({ totalUnread: 3 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads total unread on mount via unread-total', async () => {
    renderUnread(
      <ConversationUnreadProvider>
        <Probe />
      </ConversationUnreadProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('3');
    });
    expect(fetchConversationsUnreadTotal).toHaveBeenCalled();
  });

  it('does not refetch unread-total on remount within staleTime', async () => {
    const client = createTestQueryClient();
    const tree = (
      <ConversationUnreadProvider>
        <Probe />
      </ConversationUnreadProvider>
    );

    const { unmount } = renderUnread(tree, client);
    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('3');
    });
    const callsAfterFirst = fetchConversationsUnreadTotal.mock.calls.length;
    unmount();

    renderUnread(tree, client);
    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('3');
    });
    expect(fetchConversationsUnreadTotal.mock.calls.length).toBe(callsAfterFirst);
  });

  it('reconcileFromList does not overwrite badge total from partial page', async () => {
    renderUnread(
      <ConversationUnreadProvider>
        <Probe />
      </ConversationUnreadProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('3');
    });

    fireEvent.click(screen.getByText('reconcile'));

    expect(screen.getByTestId('total').textContent).toBe('3');
  });

  it('bumpFromMessage increments total', async () => {
    renderUnread(
      <ConversationUnreadProvider>
        <Probe />
      </ConversationUnreadProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('3');
    });

    fireEvent.click(screen.getByText('bump'));

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('4');
    });
  });
});
