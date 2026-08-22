/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRequestIdContextForTests } from '@/lib/observability/request-id';
import {
  authLogout,
  exchangeGoogleIdToken,
  fetchAuthMe,
  fetchAuthMeWithRetry,
  isTransientAuthMeFailure,
  parseAuthTokenLoginResponse,
  refreshAccessToken,
} from './auth-api';
import { REFERRAL_STORAGE_KEY } from '@/lib/referral-attribution';

describe('auth-api', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://auth.test';
    resetRequestIdContextForTests();
    sessionStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it('fetchAuthMe logs exactly one structured line on network failure', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('net down'));
    const r = await fetchAuthMe();
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(0);
    }
    const structured = errSpy.mock.calls
      .map((c) => c[0] as string)
      .filter((s) => {
        try {
          return JSON.parse(s).errorCode === 'UI_AUTH_ME_NETWORK';
        } catch {
          return false;
        }
      });
    expect(structured).toHaveLength(1);
  });

  it('isTransientAuthMeFailure treats 0 and 5xx as transient', () => {
    expect(isTransientAuthMeFailure(0)).toBe(true);
    expect(isTransientAuthMeFailure(500)).toBe(true);
    expect(isTransientAuthMeFailure(503)).toBe(true);
    expect(isTransientAuthMeFailure(401)).toBe(false);
    expect(isTransientAuthMeFailure(403)).toBe(false);
  });

  it('fetchAuthMeWithRetry succeeds after transient 500', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        status: 500,
        ok: false,
        headers: new Headers(),
        json: async () => ({}),
      } as Response)
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: new Headers(),
        json: async () => ({
          id: 'u1',
          email: 'a@b.com',
          displayName: 'A',
          avatarUrl: null,
          status: 'ACTIVE',
        }),
      } as Response);
    globalThis.fetch = fetchMock;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const r = await fetchAuthMeWithRetry({ maxAttempts: 2 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.user.id).toBe('u1');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetchAuthMeWithRetry silent profile stops after fewer attempts', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('net down'));
    globalThis.fetch = fetchMock;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const r = await fetchAuthMeWithRetry({ profile: 'silent' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('fetchAuthMe parses notification preference flags', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
      json: async () => ({
        id: 'u1',
        email: 'a@b.com',
        displayName: 'A',
        avatarUrl: null,
        status: 'ACTIVE',
        emailNotificationsEnabled: false,
        inAppNotificationsEnabled: true,
      }),
    } as Response);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const r = await fetchAuthMe();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.user.emailNotificationsEnabled).toBe(false);
      expect(r.user.inAppNotificationsEnabled).toBe(true);
    }
  });

  it('fetchAuthMe captures x-request-id from response for logs', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const body = {
      id: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      avatarUrl: null,
      status: 'ACTIVE',
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers({ 'x-request-id': 'auth-rid-99' }),
      json: async () => body,
    } as Response);
    const r = await fetchAuthMe();
    if (!r.ok) throw new Error('expected ok');
    const lines = logSpy.mock.calls
      .map((c) => c[0] as string)
      .filter((s) => {
        try {
          return JSON.parse(s).errorCode === 'UI_AUTH_ME_OK';
        } catch {
          return false;
        }
      });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]).requestId).toBe('auth-rid-99');
  });

  it('exchangeGoogleIdToken sends stored referral ref and clears on success', async () => {
    const ref = 'c123456789012345678901234';
    sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref);
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
      json: async () => ({
        user: {
          id: 'u-new',
          email: 'new@b.com',
          displayName: 'N',
          avatarUrl: null,
          status: 'ACTIVE',
        },
        accessToken: 'access-jwt',
        refreshToken: 'refresh-jwt',
      }),
    } as Response);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const r = await exchangeGoogleIdToken('jwt-ref');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.user.id).toBe('u-new');
      expect(r.accessToken).toBe('access-jwt');
      expect(r.refreshToken).toBe('refresh-jwt');
    }
    expect(fetch).toHaveBeenCalledWith(
      'http://auth.test/api/v1/auth/google',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idToken: 'jwt-ref', referredByUserId: ref }),
      }),
    );
    expect(sessionStorage.getItem(REFERRAL_STORAGE_KEY)).toBeNull();
  });

  it('parseAuthTokenLoginResponse rejects flat user body', () => {
    expect(
      parseAuthTokenLoginResponse({
        id: 'u1',
        email: 'a@b.com',
        status: 'ACTIVE',
      }),
    ).toBeNull();
  });

  it('fetchAuthMe sends Authorization when accessToken provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
      json: async () => ({
        id: 'u1',
        email: 'a@b.com',
        displayName: 'A',
        avatarUrl: null,
        status: 'ACTIVE',
      }),
    } as Response);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await fetchAuthMe({ accessToken: 'bearer-token' });
    expect(fetch).toHaveBeenCalledWith(
      'http://auth.test/api/v1/auth/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer bearer-token',
        }),
      }),
    );
  });

  it('refreshAccessToken posts refresh token and returns rotated pair', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
      json: async () => ({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      }),
    } as Response);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const r = await refreshAccessToken('old-refresh');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.accessToken).toBe('new-access');
      expect(r.refreshToken).toBe('new-refresh');
    }
    expect(fetch).toHaveBeenCalledWith(
      'http://auth.test/api/v1/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'old-refresh' }),
      }),
    );
  });

  it('refreshAccessToken returns failure status on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: new Headers(),
      json: async () => ({}),
    } as Response);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const r = await refreshAccessToken('stale-refresh');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it('authLogout sends Bearer and refreshToken body when provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      headers: new Headers(),
    } as Response);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    await authLogout({
      accessToken: 'access-jwt',
      refreshToken: 'refresh-jwt',
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://auth.test/api/v1/auth/logout',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-jwt',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ refreshToken: 'refresh-jwt' }),
      }),
    );
  });
});
