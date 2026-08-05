/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { fetchBetaMetrics } = vi.hoisted(() => ({
  fetchBetaMetrics: vi.fn(),
}));

vi.mock('@/lib/admin-beta-metrics-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/admin-beta-metrics-api')>(
    '@/lib/admin-beta-metrics-api',
  );
  return {
    ...actual,
    fetchBetaMetrics,
  };
});

vi.mock('next/link', () => ({
  default({
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

import AdminBetaMetricsPageClient from './beta-metrics-page-client';

describe('AdminBetaMetricsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders metric cards from API', async () => {
    fetchBetaMetrics.mockResolvedValue({
      generatedAt: '2026-08-05T12:00:00.000Z',
      betaStart: '2026-08-01T00:00:00.000Z',
      activeUsers7d: 12,
      signupsSinceBetaStart: 40,
      d7: {
        cohortSize: 25,
        returnedCount: 10,
        rate: 0.4,
        advisory: false,
      },
      opener: {
        windowDays: 7,
        generated: 10,
        displayed: 8,
        used: 4,
        sent: 3,
        replied: 2,
        usageRate: 0.5,
        responseRate: 2 / 3,
      },
      priorityShare: {
        highCount: 20,
        goodCount: 30,
        otherCount: 50,
        scoredCount: 100,
        highShare: 0.2,
        goodShare: 0.3,
        otherShare: 0.5,
      },
      highPriorityEmails7d: 3,
    });

    render(<AdminBetaMetricsPageClient />);

    await waitFor(() => {
      expect(screen.getByTestId('beta-metrics-grid')).toBeTruthy();
    });
    expect(screen.getByTestId('metric-active-users').textContent).toContain('12');
    expect(screen.getByTestId('metric-d7').textContent).toContain('40%');
    expect(screen.getByTestId('metric-hp-emails').textContent).toContain('3');
  });
});
