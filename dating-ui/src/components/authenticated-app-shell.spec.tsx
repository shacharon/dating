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

const authState = vi.hoisted(() => ({
  status: 'authenticated' as 'authenticated' | 'error' | 'loading' | 'unauthenticated',
  user: {
    id: 'user_me',
    email: 'a@test.com',
    displayName: 'A',
    avatarUrl: null,
    status: 'ACTIVE' as const,
    emailNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
  },
  refresh: vi.fn(),
  signInWithGoogleIdToken: vi.fn(),
  logout: vi.fn(),
  lastError: null as string | null,
  clearLastError: vi.fn(),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => authState,
}));

import { AuthenticatedAppShell } from '@/components/authenticated-app-shell';
import {
  APP_LOCALE_STORAGE_KEY,
  writeStoredLocale,
} from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';

describe('AuthenticatedAppShell locale', () => {
  beforeEach(() => {
    authState.status = 'authenticated';
    authState.user = {
      id: 'user_me',
      email: 'a@test.com',
      displayName: 'A',
      avatarUrl: null,
      status: 'ACTIVE',
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    };
    authState.lastError = null;
    localStorage.clear();
    fetchMyConversations.mockResolvedValue({ conversations: [] });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('wraps authenticated chrome in RTL when locale is Hebrew', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'בית' })).toBeTruthy();
    });

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav.closest('[dir="rtl"]')).toBeTruthy();
  });

  it('updates main nav labels when locale changes without reload', async () => {
    render(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy();
    });

    writeStoredLocale('he');

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'בית' })).toBeTruthy();
    });
  });
});

describe('AuthenticatedAppShell nav unread', () => {
  beforeEach(() => {
    authState.status = 'authenticated';
    authState.user = {
      id: 'user_me',
      email: 'a@test.com',
      displayName: 'A',
      avatarUrl: null,
      status: 'ACTIVE',
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    };
    authState.lastError = null;
    localStorage.clear();
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

  it('uses Hebrew unread aria label when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('nav-conversations-unread')).toBeTruthy();
    });

    expect(
      screen.getByTestId('nav-conversations-unread').getAttribute('aria-label'),
    ).toBe(heCopy.nav.conversationsUnreadLabel(2));
  });
});

describe('AuthenticatedAppShell auth error i18n', () => {
  beforeEach(() => {
    authState.status = 'error';
    authState.user = null;
    authState.lastError = null;
    localStorage.clear();
  });

  afterEach(() => {
    authState.status = 'authenticated';
    authState.user = {
      id: 'user_me',
      email: 'a@test.com',
      displayName: 'A',
      avatarUrl: null,
      status: 'ACTIVE',
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    };
    cleanup();
    localStorage.clear();
  });

  it('renders appShell error copy in English by default', () => {
    render(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    expect(screen.getByText('Cannot reach dating-api')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Retry connection' }),
    ).toBeTruthy();
  });

  it('renders appShell error copy in Hebrew when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    render(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getByText(heCopy.appShell.apiUnreachableTitle)).toBeTruthy();
    });
    expect(
      screen.getByRole('button', { name: heCopy.appShell.retryConnection }),
    ).toBeTruthy();
  });
});
