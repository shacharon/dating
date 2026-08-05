import { getApiBase } from '@/lib/api-base';

export type NotificationPreferences = {
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  highPriorityMatchEmailsEnabled: boolean;
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export async function patchNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/me/notification-preferences`, {
    method: 'PATCH',
    credentials: 'include',
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      text.trim() || `PATCH notification preferences failed: ${res.status}`,
    );
  }

  const json = (await res.json()) as NotificationPreferences;
  return json;
}
