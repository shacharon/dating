import { getApiBase } from '@/lib/api/api-base';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export async function deleteMyAccount(confirmation: string): Promise<void> {
  const base = getApiBase();
  const res = await authenticatedFetch(`/api/v1/me/account`, {
    method: 'DELETE',
    headers: JSON_HEADERS,
    body: JSON.stringify({ confirmation }),
  });
  if (res.status === 204) {
    return;
  }
  const text = await res.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    if (parsed.error === 'account_delete_confirmation_invalid') {
      throw new Error('account_delete_confirmation_invalid');
    }
    if (parsed.error === 'account_already_deleted') {
      throw new Error('account_already_deleted');
    }
    if (parsed.message) {
      throw new Error(parsed.message);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('account_')) {
      throw e;
    }
  }
  throw new Error(
    `DELETE /api/v1/me/account failed: ${res.status} ${text || ''}`.trim(),
  );
}
