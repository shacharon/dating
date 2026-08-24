import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { patchNotificationPreferences } from '@/lib/api/notification-preferences-api';

describe('notification-preferences-api', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://prefs.test';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it('patchNotificationPreferences sends PATCH with credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        emailNotificationsEnabled: false,
        inAppNotificationsEnabled: true,
      }),
    } as Response);
    globalThis.fetch = fetchMock;

    const result = await patchNotificationPreferences({
      emailNotificationsEnabled: false,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://prefs.test/api/v1/me/notification-preferences',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ emailNotificationsEnabled: false }),
      }),
    );
    expect(result).toEqual({
      emailNotificationsEnabled: false,
      inAppNotificationsEnabled: true,
    });
  });
});
