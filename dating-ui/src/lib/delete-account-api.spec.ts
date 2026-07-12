import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteMyAccount } from '@/lib/delete-account-api';

describe('delete-account-api', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://account.test';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it('deleteMyAccount sends DELETE with confirmation and credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: async () => '',
    } as Response);
    globalThis.fetch = fetchMock;

    await deleteMyAccount('DELETE');

    expect(fetchMock).toHaveBeenCalledWith(
      'http://account.test/api/v1/me/account',
      expect.objectContaining({
        method: 'DELETE',
        credentials: 'include',
        body: JSON.stringify({ confirmation: 'DELETE' }),
      }),
    );
  });

  it('deleteMyAccount throws account_delete_confirmation_invalid on 400', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({ error: 'account_delete_confirmation_invalid' }),
    } as Response);

    await expect(deleteMyAccount('NOPE')).rejects.toThrow(
      'account_delete_confirmation_invalid',
    );
  });
});
