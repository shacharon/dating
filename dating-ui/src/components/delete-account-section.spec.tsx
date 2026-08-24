/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';

const { deleteMyAccountMock, refreshMock, replaceMock } = vi.hoisted(() => ({
  deleteMyAccountMock: vi.fn(),
  refreshMock: vi.fn().mockResolvedValue(undefined),
  replaceMock: vi.fn(),
}));

vi.mock('@/lib/api/delete-account-api', () => ({
  deleteMyAccount: deleteMyAccountMock,
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ refresh: refreshMock }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

import { DeleteAccountSection } from '@/components/delete-account-section';

describe('DeleteAccountSection', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    deleteMyAccountMock.mockResolvedValue(undefined);
  });

  it('disables submit until DELETE is typed', () => {
    render(<DeleteAccountSection />);
    const submit = screen.getByTestId('delete-account-submit');
    expect(submit).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByTestId('delete-account-confirmation'), {
      target: { value: 'DELETE' },
    });
    expect(submit).toHaveProperty('disabled', false);
  });

  it('calls delete API and redirects on success', async () => {
    render(<DeleteAccountSection />);
    fireEvent.change(screen.getByTestId('delete-account-confirmation'), {
      target: { value: 'DELETE' },
    });
    fireEvent.click(screen.getByTestId('delete-account-submit'));
    await waitFor(() => {
      expect(deleteMyAccountMock).toHaveBeenCalledWith('DELETE');
    });
    expect(refreshMock).toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith('/');
  });
});
