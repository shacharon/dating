import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createMyProfile,
  fetchMyProfile,
  patchMyProfile,
} from '@/lib/me-profile-api';

describe('me-profile-api', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it('fetchMyProfile throws on 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '',
    } as Response);
    await expect(fetchMyProfile()).rejects.toThrow(/401/);
  });

  it('fetchMyProfile returns null on 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    } as Response);
    await expect(fetchMyProfile()).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('fetchMyProfile parses JSON on 200', async () => {
    const body = {
      id: '1',
      userId: 'u',
      status: 'DRAFT',
      onboardingStep: 1,
      aboutMe: 'hi',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: 't',
      updatedAt: 't',
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(body),
    } as Response);
    await expect(fetchMyProfile()).resolves.toEqual(body);
  });

  it('createMyProfile POSTs JSON with credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ ok: true }),
    } as Response);
    await createMyProfile({ aboutMe: 'x' });
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify({ aboutMe: 'x' }),
      }),
    );
  });

  it('patchMyProfile PATCHes JSON with credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    } as Response);
    await patchMyProfile({ aboutPartner: 'y' });
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ aboutPartner: 'y' }),
      }),
    );
  });
});
