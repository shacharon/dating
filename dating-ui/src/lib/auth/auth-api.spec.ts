import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRequestIdContextForTests } from '@/lib/observability/request-id';
import { fetchAuthMe } from './auth-api';

describe('auth-api', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://auth.test';
    resetRequestIdContextForTests();
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
});
