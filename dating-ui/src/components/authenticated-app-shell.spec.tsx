/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { fetchConversationsUnreadTotal, getRealtimeMode } = vi.hoisted(() => ({
  fetchConversationsUnreadTotal: vi.fn(),
  getRealtimeMode: vi.fn(() => 'ws' as const),
}));

vi.mock('@/lib/conversations-api', () => ({
  fetchConversationsUnreadTotal,
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
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/nav-auth', () => ({
  NavAuth: () => <div data-testid="nav-auth" />,
}));

const authState = vi.hoisted(() => ({
  status: 'authenticated' as
    | 'authenticated'
    | 'error'
    | 'loading'
    | 'unauthenticated',
  user: {
    id: 'user_me',
    email: 'a@test.com',
    displayName: 'A',
    avatarUrl: null,
    status: 'ACTIVE' as const,
    emailNotificationsEnabled: true,
    inAppNotificationsEnabled: true,
  } as {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: null;
    status: 'ACTIVE';
    emailNotificationsEnabled: boolean;
    inAppNotificationsEnabled: boolean;
  } | null,
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
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';
import { QueryClientTestProvider } from '@/test/query-client-wrapper';

function renderShell(ui: React.ReactElement) {
  return render(<QueryClientTestProvider>{ui}</QueryClientTestProvider>);
}

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
    fetchConversationsUnreadTotal.mockResolvedValue({ totalUnread: 0 });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('wraps authenticated chrome in RTL when locale is Hebrew', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'התאמות' }).length).toBeGreaterThan(0);
    });

    const nav = screen.getByRole('navigation', { name: heCopy.nav.mainAria });
    expect(nav.closest('[dir="rtl"]')).toBeTruthy();
  });

  it('updates main nav labels when locale changes without reload', async () => {
    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Matches' }).length).toBeGreaterThan(0);
    });

    writeStoredLocale('he');

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'התאמות' }).length).toBeGreaterThan(0);
    });
  });

  it('does not show Home or Analysis as primary nav links', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'en');

    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Matches' }).length).toBeGreaterThan(0);
    });

    expect(screen.queryByRole('link', { name: 'Home' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Analysis' })).toBeNull();
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
    fetchConversationsUnreadTotal.mockResolvedValue({ totalUnread: 2 });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows nav unread pill when total > 0', async () => {
    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      const pills = screen.getAllByTestId('nav-conversations-unread');
      expect(pills.length).toBeGreaterThan(0);
      expect(pills[0].textContent).toBe('2');
    });
  });

  it('caps nav unread pill at 99+', async () => {
    fetchConversationsUnreadTotal.mockResolvedValue({ totalUnread: 100 });

    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('nav-conversations-unread')[0].textContent).toBe(
        '99+',
      );
    });
  });

  it('hides nav unread pill when total is 0', async () => {
    fetchConversationsUnreadTotal.mockResolvedValue({ totalUnread: 0 });

    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(fetchConversationsUnreadTotal).toHaveBeenCalled();
    });

    expect(screen.queryByTestId('nav-conversations-unread')).toBeNull();
  });

  it('uses Hebrew unread aria label when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');

    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('nav-conversations-unread').length).toBeGreaterThan(0);
    });

    expect(
      screen.getAllByTestId('nav-conversations-unread')[0].getAttribute('aria-label'),
    ).toBe(heCopy.nav.conversationsUnreadLabel(2));
  });
});

describe('AuthenticatedAppShell offline banner', () => {
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
    vi.stubGlobal('navigator', { onLine: true });
    localStorage.clear();
    fetchConversationsUnreadTotal.mockResolvedValue({ totalUnread: 0 });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows offline banner in authenticated product chrome when offline', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'en');
    vi.stubGlobal('navigator', { onLine: false });

    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    window.dispatchEvent(new Event('offline'));

    await waitFor(() => {
      expect(screen.getByText(enCopy.appShell.offlineBanner)).toBeTruthy();
    });
  });

  it('does not mount offline banner on auth error screen', () => {
    authState.status = 'error';
    authState.user = null;
    vi.stubGlobal('navigator', { onLine: false });

    renderShell(
      <AuthenticatedAppShell>
        <div>page</div>
      </AuthenticatedAppShell>,
    );

    expect(
      screen.queryByText(/You're offline\. Some features may be unavailable/),
    ).toBeNull();
  });
});

describe('AuthenticatedAppShell auth error i18n', () => {
  beforeEach(() => {
    authState.status = 'error';
    authState.user = null;
    authState.lastError = null;
    localStorage.clear();
    document.cookie = 'locale=; max-age=0; path=/';
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
    document.cookie = 'locale=; max-age=0; path=/';
  });

  it('renders appShell error copy in English by default', () => {
    renderShell(
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

    renderShell(
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
