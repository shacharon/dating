/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { fetchMyConversations, getRealtimeMode } = vi.hoisted(() => ({
  fetchMyConversations: vi.fn(),
  getRealtimeMode: vi.fn(() => 'ws' as const),
}));

vi.mock('@/lib/conversations-api', () => ({
  fetchMyConversations,
}));

vi.mock('@/lib/realtime-mode', () => ({
  getRealtimeMode,
}));

vi.mock('@/hooks/use-messaging-socket', () => ({
  useMessagingSocket: () => {},
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/dating/profile',
}));

vi.mock('@/components/nav-auth', () => ({
  NavAuth: () => <div data-testid="nav-auth" />,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'user_me',
      email: 'a@test.com',
      displayName: 'A',
      avatarUrl: null,
      status: 'ACTIVE',
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    },
    refresh: vi.fn(),
    signInWithGoogleIdToken: vi.fn(),
    logout: vi.fn(),
    lastError: null,
    clearLastError: vi.fn(),
  }),
}));

import { AuthenticatedAppShell } from '@/components/authenticated-app-shell';

describe('AuthenticatedAppShell nav unread', () => {
  beforeEach(() => {
    fetchMyConversations.mockResolvedValue({
      conversations: [
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
      ],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows nav unread pill when total > 0', async () => {
    render(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('nav-conversations-unread')).toBeTruthy();
      expect(screen.getByTestId('nav-conversations-unread').textContent).toBe('2');
    });
  });

  it('caps nav unread pill at 99+', async () => {
    fetchMyConversations.mockResolvedValue({
      conversations: Array.from({ length: 100 }, (_, i) => ({
        id: `conv_${i}`,
        matchedAt: '2026-06-01T10:00:00.000Z',
        unreadCount: 1,
        otherUser: {
          id: `user_peer_${i}`,
          profileId: `prof_peer_${i}`,
          nickname: 'Noa',
          gender: null,
          ageYears: null,
          locationLabel: null,
          photoUrl: null,
        },
      })),
    });

    render(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('nav-conversations-unread').textContent).toBe(
        '99+',
      );
    });
  });

  it('hides nav unread pill when total is 0', async () => {
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
            gender: null,
            ageYears: null,
            locationLabel: null,
            photoUrl: null,
          },
        },
      ],
    });

    render(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(fetchMyConversations).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('nav-conversations-unread')).toBeNull();
  });
});
