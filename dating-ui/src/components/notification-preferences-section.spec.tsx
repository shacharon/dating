/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { patchNotificationPreferences, refreshMock } = vi.hoisted(() => ({
  patchNotificationPreferences: vi.fn(),
  refreshMock: vi.fn(),
}));

vi.mock('@/lib/notification-preferences-api', () => ({
  patchNotificationPreferences,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: {
      id: 'user_me',
      email: 'a@test.com',
      displayName: 'A',
      avatarUrl: null,
      status: 'ACTIVE',
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
      highPriorityMatchEmailsEnabled: true,
    },
    refresh: refreshMock,
    status: 'authenticated',
    signInWithGoogleIdToken: vi.fn(),
    logout: vi.fn(),
    lastError: null,
    clearLastError: vi.fn(),
  }),
}));

import { NotificationPreferencesSection } from '@/components/notification-preferences-section';

describe('NotificationPreferencesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patchNotificationPreferences.mockResolvedValue({
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: false,
      highPriorityMatchEmailsEnabled: true,
    });
    refreshMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders toggles including high-priority', () => {
    render(<NotificationPreferencesSection />);
    expect(screen.getByTestId('notification-pref-in-app')).toBeTruthy();
    expect(screen.getByTestId('notification-pref-email')).toBeTruthy();
    expect(screen.getByTestId('notification-pref-high-priority')).toBeTruthy();
  });

  it('patches preference and refreshes auth on in-app toggle', async () => {
    render(<NotificationPreferencesSection />);

    fireEvent.click(screen.getByTestId('notification-pref-in-app'));

    await waitFor(() => {
      expect(patchNotificationPreferences).toHaveBeenCalledWith({
        inAppNotificationsEnabled: false,
      });
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it('patches email preference independently', async () => {
    render(<NotificationPreferencesSection />);

    fireEvent.click(screen.getByTestId('notification-pref-email'));

    await waitFor(() => {
      expect(patchNotificationPreferences).toHaveBeenCalledWith({
        emailNotificationsEnabled: false,
      });
      expect(refreshMock).toHaveBeenCalled();
    });
  });
});
