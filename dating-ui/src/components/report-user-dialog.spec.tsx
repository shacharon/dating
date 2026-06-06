/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { createUserReport } = vi.hoisted(() => ({
  createUserReport: vi.fn(),
}));

vi.mock('@/lib/report-user-api', () => ({
  createUserReport,
}));

import { ReportUserDialog } from '@/components/report-user-dialog';

describe('ReportUserDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUserReport.mockResolvedValue({
      id: 'report-1',
      reason: 'HARASSMENT',
      status: 'OPEN',
      createdAt: '2026-06-06T12:00:00.000Z',
      contextType: 'MATCH_PROFILE',
      contextId: 'prof-1',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('submits report after confirm', async () => {
    render(
      <ReportUserDialog
        open
        onClose={vi.fn()}
        contextType="MATCH_PROFILE"
        contextId="prof-1"
        subjectLabel="Alex"
      />,
    );

    fireEvent.click(screen.getByTestId('report-user-continue'));
    fireEvent.click(screen.getByTestId('report-user-submit'));

    await waitFor(() => {
      expect(createUserReport).toHaveBeenCalledWith({
        reason: 'HARASSMENT',
        details: null,
        contextType: 'MATCH_PROFILE',
        contextId: 'prof-1',
      });
      expect(screen.getByTestId('report-user-success')).toBeTruthy();
    });
  });

  it('submits report with details when provided', async () => {
    render(
      <ReportUserDialog
        open
        onClose={vi.fn()}
        contextType="MATCH_PROFILE"
        contextId="prof-1"
        subjectLabel="Alex"
      />,
    );

    fireEvent.change(screen.getByTestId('report-user-details'), {
      target: { value: 'Inappropriate messages' },
    });
    fireEvent.click(screen.getByTestId('report-user-continue'));
    fireEvent.click(screen.getByTestId('report-user-submit'));

    await waitFor(() => {
      expect(createUserReport).toHaveBeenCalledWith(
        expect.objectContaining({
          details: 'Inappropriate messages',
        }),
      );
    });
  });

  it('shows duplicate error message', async () => {
    createUserReport.mockRejectedValue(new Error('report_duplicate'));

    render(
      <ReportUserDialog
        open
        onClose={vi.fn()}
        contextType="CONVERSATION"
        contextId="conv-1"
        subjectLabel="Noa"
      />,
    );

    fireEvent.click(screen.getByTestId('report-user-continue'));
    fireEvent.click(screen.getByTestId('report-user-submit'));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'already submitted this report',
      );
    });
  });
});
