import { getApiBase } from '@/lib/api-base';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export type AdminReportListItem = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporterUserId: string;
  reportedUserId: string;
  contextType: string;
};

export type ListAdminReportsResponse = {
  items: AdminReportListItem[];
  nextCursor: string | null;
};

export type AdminReportDetail = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  reporterUserId: string;
  reportedUserId: string;
  contextType: string;
  contextId: string;
  contextPath: string;
  details: string | null;
  opsNote: string | null;
};

export async function listAdminReports(
  status: 'OPEN' | 'DISMISSED' | 'ACTION_TAKEN' = 'OPEN',
  cursor?: string,
): Promise<ListAdminReportsResponse> {
  const base = getApiBase();
  const params = new URLSearchParams({ status });
  if (cursor) params.set('cursor', cursor);
  const res = await authenticatedFetch(`/api/v1/admin/reports?${params.toString()}`, {
    headers: { Accept: 'application/json' },
  });
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`GET admin reports failed: ${res.status}`);
  }
  return (await res.json()) as ListAdminReportsResponse;
}

export async function getAdminReport(reportId: string): Promise<AdminReportDetail> {
  const base = getApiBase();
  const res = await authenticatedFetch(`/api/v1/admin/reports/${encodeURIComponent(reportId)}`,
    {
    headers: { Accept: 'application/json' } },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`GET admin report failed: ${res.status}`);
  }
  return (await res.json()) as AdminReportDetail;
}

export async function updateAdminReport(
  reportId: string,
  status: 'DISMISSED' | 'ACTION_TAKEN',
  opsNote?: string,
): Promise<AdminReportDetail> {
  const base = getApiBase();
  const res = await authenticatedFetch(`/api/v1/admin/reports/${encodeURIComponent(reportId)}`,
    {
      method: 'PATCH',
    headers: JSON_HEADERS,
      body: JSON.stringify({
        status,
        ...(opsNote?.trim() ? { opsNote: opsNote.trim() } : {}),
      }),
    },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`PATCH admin report failed: ${res.status}`);
  }
  return (await res.json()) as AdminReportDetail;
}
