import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminReportsPage } from './use-admin-reports-page';
import * as api from '@/lib/admin-reports-api';
import { QueryClientTestProvider } from '@/test/query-client-wrapper';

vi.mock('@/lib/admin-reports-api');

const listAdminReports = vi.mocked(api.listAdminReports);
const getAdminReport = vi.mocked(api.getAdminReport);

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientTestProvider>{children}</QueryClientTestProvider>;
}

describe('useAdminReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAdminReports.mockResolvedValue({ items: [], nextCursor: null });
  });

  it('loads open reports on mount', async () => {
    const { result } = renderHook(() => useAdminReportsPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(listAdminReports).toHaveBeenCalledWith('OPEN');
    expect(result.current.error).toBeNull();
  });

  it('maps admin_forbidden on list', async () => {
    listAdminReports.mockRejectedValue(new Error('admin_forbidden'));

    const { result } = renderHook(() => useAdminReportsPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'You are not authorized to view the admin report queue.',
      );
    });
  });

  it('loads detail when selected', async () => {
    listAdminReports.mockResolvedValue({
      items: [
        {
          id: 'r1',
          createdAt: new Date().toISOString(),
          reason: 'HARASSMENT',
          status: 'OPEN',
          reporterUserId: 'a',
          reportedUserId: 'b',
          contextType: 'CONVERSATION',
        },
      ],
      nextCursor: null,
    });
    getAdminReport.mockResolvedValue({
      id: 'r1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reason: 'HARASSMENT',
      details: 'hi',
      reporterUserId: 'a',
      reportedUserId: 'b',
      contextType: 'CONVERSATION',
      contextId: 'c1',
      contextPath: '/dating/conversations/c1',
      status: 'OPEN',
      opsNote: null,
    });

    const { result } = renderHook(() => useAdminReportsPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.setSelectedId('r1');

    await waitFor(() => {
      expect(result.current.detail?.id).toBe('r1');
    });

    expect(getAdminReport).toHaveBeenCalledWith('r1');
  });
});
