/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { fetchMyConversations } = vi.hoisted(() => ({
  fetchMyConversations: vi.fn(),
}));

vi.mock('@/lib/conversations-api', () => ({
  fetchMyConversations,
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

describe('ConversationUnreadProvider', () => {
  beforeEach(() => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'conv_1',
          matchedAt: '2026-06-01T10:00:00.000Z',
          unreadCount: 3,
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
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('loads total unread on mount', async () => {
    render(
      <ConversationUnreadProvider>
        <Probe />
      </ConversationUnreadProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('3');
    });
  });

  it('reconcileFromList replaces optimistic total', async () => {
    render(
      <ConversationUnreadProvider>
        <Probe />
      </ConversationUnreadProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('3');
    });

    fetchMyConversations.mockImplementation(() => new Promise(() => {}));

    fireEvent.click(screen.getByText('reconcile'));

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('2');
    });
  });

  it('bumpFromMessage increments total', async () => {
    render(
      <ConversationUnreadProvider>
        <Probe />
      </ConversationUnreadProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('3');
    });

    fetchMyConversations.mockImplementation(() => new Promise(() => {}));

    fireEvent.click(screen.getByText('bump'));

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('4');
    });
  });
});
