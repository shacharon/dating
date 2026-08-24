import { getApiBase } from '@/lib/api/api-base';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';
import type {
  CreateUserReportBody,
  UserReportResponseDto,
} from '@/lib/api/report-user-options';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

function reportErrorMessage(status: number, errBody: string): string {
  try {
    const parsed = JSON.parse(errBody) as { error?: string; message?: string };
    if (parsed.error === 'report_duplicate') {
      return 'report_duplicate';
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch {
    // fall through
  }
  return `POST /api/v1/me/reports failed: ${status} ${errBody || ''}`.trim();
}

export async function createUserReport(
  body: CreateUserReportBody,
): Promise<UserReportResponseDto> {
  const base = getApiBase();
  const res = await authenticatedFetch(`/api/v1/me/reports`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(reportErrorMessage(res.status, text));
  }
  return JSON.parse(text) as UserReportResponseDto;
}
