/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { fetchMyConversations } = vi.hoisted(() => ({
  fetchMyConversations: vi.fn(),
}));

vi.mock('@/lib/conversations-api', () => ({
  fetchMyConversations,
  conversationPhotoSrc: (url: string | null) => url,
}));

import ConversationsPage from './page';

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

describe('ConversationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders empty state when there are no conversations', async () => {
    fetchMyConversations.mockResolvedValue({ conversations: [] });

    const { unmount } = render(<ConversationsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversations-empty')).toBeTruthy();
    });
    expect(screen.getByText(/No matches yet. Keep swiping!/)).toBeTruthy();
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
    });

    const { unmount } = render(<ConversationsPage />);

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
    });

    const { unmount, container } = render(<ConversationsPage />);

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
    });

    const { unmount } = render(<ConversationsPage />);

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
    });

    const { unmount } = render(<ConversationsPage />);

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
        },
      ],
    });

    const { unmount } = render(<ConversationsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('conversation-unread-badge')).toBeTruthy();
    });
    expect(
      screen.getByTestId('conversation-unread-badge').getAttribute('aria-label'),
    ).toBe('1 unread message');
    unmount();
  });

  it('refetches conversations when tab becomes visible', async () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });

    fetchMyConversations.mockResolvedValue({
      conversations: [
        {
          id: 'mutual_1',
          otherUser,
          matchedAt: '2026-05-31T12:00:00.000Z',
          unreadCount: 0,
        },
      ],
    });

    const { unmount } = render(<ConversationsPage />);

    await waitFor(() => {
      expect(fetchMyConversations).toHaveBeenCalledTimes(1);
    });

    document.dispatchEvent(new Event('visibilitychange'));

    await waitFor(() => {
      expect(fetchMyConversations).toHaveBeenCalledTimes(2);
    });
    unmount();
  });
});
