import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminContentViolationsPage } from './use-admin-content-violations';
import * as api from '@/lib/admin-content-violations-api';
import { QueryClientTestProvider } from '@/test/query-client-wrapper';

vi.mock('@/lib/admin-content-violations-api');

const listAdminBlockedUsers = vi.mocked(api.listAdminBlockedUsers);
const listAdminContentViolations = vi.mocked(api.listAdminContentViolations);
const getAdminContentViolationStats = vi.mocked(
  api.getAdminContentViolationStats,
);
const unblockAdminContentUser = vi.mocked(api.unblockAdminContentUser);

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientTestProvider>{children}</QueryClientTestProvider>;
}

describe('useAdminContentViolationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAdminBlockedUsers.mockResolvedValue({ users: [], total: 0 });
    listAdminContentViolations.mockResolvedValue({
      violations: [],
      total: 0,
    });
    getAdminContentViolationStats.mockResolvedValue({
      totalViolations: 0,
      violationsByCategory: {},
      violationsBySurface: {},
      blockedProfileUsers: 0,
      mutedMessageUsers: 0,
      mutedMessageUsersTemporary: 0,
      mutedMessageUsersIndefinite: 0,
    });
  });

  it('loads blocked users, violations, and stats on mount', async () => {
    const { result } = renderHook(() => useAdminContentViolationsPage(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(listAdminBlockedUsers).toHaveBeenCalled();
    expect(listAdminContentViolations).toHaveBeenCalled();
    expect(getAdminContentViolationStats).toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('maps admin_forbidden to authorization error message', async () => {
    listAdminContentViolations.mockRejectedValue(new Error('admin_forbidden'));

    const { result } = renderHook(() => useAdminContentViolationsPage(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBe(
        'You are not authorized to view content violations.',
      );
    });
  });

  it('requires unblock reason and does not call API when empty', async () => {
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('   ');
    const { result } = renderHook(() => useAdminContentViolationsPage(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.unblock('user_1');
    });

    expect(unblockAdminContentUser).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Unblock reason is required.');
    prompt.mockRestore();
  });
});
