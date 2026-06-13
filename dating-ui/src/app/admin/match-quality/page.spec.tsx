/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';

const {
  getMatchQualitySummary,
  listNegativeCandidates,
} = vi.hoisted(() => ({
  getMatchQualitySummary: vi.fn(),
  listNegativeCandidates: vi.fn(),
}));

vi.mock('@/lib/admin-match-quality-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/admin-match-quality-api')>();
  return {
    ...actual,
    getMatchQualitySummary,
    listNegativeCandidates,
  };
});

vi.mock('next/link', () => ({
  default ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  },
}));

import AdminMatchQualityPage from './page';

const summaryFixture = {
  windowDays: 7,
  windowStart: '2026-06-01T00:00:00.000Z',
  feedbackCount: 8,
  positiveCount: 5,
  negativeCount: 3,
  positiveRate: 0.625,
  distinctReporters: 3,
  distinctCandidates: 2,
};

const listFixture = {
  windowDays: 7,
  total: 1,
  limit: 20,
  offset: 0,
  items: [
    {
      matchProfileId: 'prof_negative_1',
      negativeCount: 3,
      distinctViewers: 3,
      lastNegativeAt: '2026-06-05T12:00:00.000Z',
    },
  ],
};

describe('AdminMatchQualityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMatchQualitySummary.mockResolvedValue(summaryFixture);
    listNegativeCandidates.mockResolvedValue(listFixture);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders summary cards from mocked API', async () => {
    render(<AdminMatchQualityPage />);

    await waitFor(() => {
      expect(screen.getByText('8')).toBeTruthy();
    });
    expect(screen.getByText('62.5%')).toBeTruthy();
    expect(screen.getByText('Distinct reporters').nextElementSibling?.textContent).toBe(
      '3',
    );
  });

  it('renders negative table with audit link', async () => {
    render(<AdminMatchQualityPage />);

    await waitFor(() => {
      expect(screen.getByText('prof_negative_1')).toBeTruthy();
    });
    const auditLink = screen.getByRole('link', { name: 'View audit' });
    expect(auditLink.getAttribute('href')).toBe('/admin/match-quality/prof_negative_1');
  });

  it('shows empty state when feedback count is zero', async () => {
    getMatchQualitySummary.mockResolvedValue({
      ...summaryFixture,
      feedbackCount: 0,
      positiveCount: 0,
      negativeCount: 0,
      positiveRate: null,
      distinctReporters: 0,
    });
    listNegativeCandidates.mockResolvedValue({
      ...listFixture,
      items: [],
      total: 0,
    });

    render(<AdminMatchQualityPage />);

    await waitFor(() => {
      expect(screen.getByText('No feedback yet')).toBeTruthy();
    });
    expect(screen.queryByRole('columnheader', { name: 'Profile ID' })).toBeNull();
  });

  it('shows authorization error for admin_forbidden', async () => {
    getMatchQualitySummary.mockRejectedValue(new Error('admin_forbidden'));

    render(<AdminMatchQualityPage />);

    await waitFor(() => {
      expect(
        screen.getByText('You are not authorized to view match quality.'),
      ).toBeTruthy();
    });
  });

  it('refetches with windowDays=30 when 30 days selected', async () => {
    render(<AdminMatchQualityPage />);

    await waitFor(() => {
      expect(getMatchQualitySummary).toHaveBeenCalledWith(7);
    });

    fireEvent.click(screen.getByRole('button', { name: '30 days' }));

    await waitFor(() => {
      expect(getMatchQualitySummary).toHaveBeenCalledWith(30);
      expect(listNegativeCandidates).toHaveBeenCalledWith(30, 20, 0);
    });
  });
});
