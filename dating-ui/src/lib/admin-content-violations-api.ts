import { getApiBase } from '@/lib/api-base';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export type AdminContentViolationListItem = {
  id: string;
  userId: string;
  userEmail: string;
  userNickname: string | null;
  userStatus: string;
  userMutedUntil: string | null;
  surface: string;
  category: string;
  flaggedTextPreview: string;
  score: number | null;
  action: string;
  createdAt: string;
  conversationId: string | null;
  recipientUserId: string | null;
  recipientEmail: string | null;
  recipientNickname: string | null;
};

export type ListAdminContentViolationsResponse = {
  violations: AdminContentViolationListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminContentViolationStats = {
  totalViolations: number;
  violationsByCategory: Record<string, number>;
  violationsBySurface: Record<string, number>;
  blockedProfileUsers: number;
  mutedMessageUsers: number;
  mutedMessageUsersTemporary: number;
  mutedMessageUsersIndefinite: number;
};

export type UnblockContentViolationResponse = {
  success: true;
  userId: string;
  previousStatus: string;
  clearedAt: string;
};

export type ListAdminContentViolationsFilters = {
  surface?: string;
  category?: string;
  userId?: string;
  limit?: number;
  offset?: number;
};

export async function listAdminContentViolations(
  filters: ListAdminContentViolationsFilters = {},
): Promise<ListAdminContentViolationsResponse> {
  const base = getApiBase();
  const params = new URLSearchParams();
  if (filters.surface) params.set('surface', filters.surface);
  if (filters.category) params.set('category', filters.category);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.limit != null) params.set('limit', String(filters.limit));
  if (filters.offset != null) params.set('offset', String(filters.offset));

  const qs = params.toString();
  const res = await fetch(
    `${base}/api/v1/admin/content-violations${qs ? `?${qs}` : ''}`,
    {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`GET admin content-violations failed: ${res.status}`);
  }
  return (await res.json()) as ListAdminContentViolationsResponse;
}

export async function getAdminContentViolationStats(): Promise<AdminContentViolationStats> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/admin/content-violations/stats`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`GET admin content-violations stats failed: ${res.status}`);
  }
  return (await res.json()) as AdminContentViolationStats;
}

export async function unblockAdminContentUser(
  userId: string,
  reason: string,
): Promise<UnblockContentViolationResponse> {
  const base = getApiBase();
  const res = await fetch(
    `${base}/api/v1/admin/content-violations/unblock/${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify({ reason }),
    },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`POST admin content-violations unblock failed: ${res.status}`);
  }
  return (await res.json()) as UnblockContentViolationResponse;
}
