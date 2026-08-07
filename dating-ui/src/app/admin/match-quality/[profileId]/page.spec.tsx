/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';

const { getCandidateAudit } = vi.hoisted(() => ({
  getCandidateAudit: vi.fn(),
}));

vi.mock('@/lib/admin-match-quality-api', () => ({
  getCandidateAudit,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ profileId: 'cand_profile_1' }),
}));

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

import AdminMatchQualityCandidatePage from './candidate-page-client';

const auditFixture = {
  candidateProfileId: 'cand_profile_1',
  viewerUserId: 'viewer_user_1',
  windowDays: 7,
  feedbackSummary: {
    negativeCount: 3,
    positiveCount: 1,
    lastSentiment: 'NEGATIVE' as const,
  },
  audit: {
    schemaVersion: 1 as const,
    compare: { outcome: 'scored' as const },
    matchScore: 74,
    viewer: { userId: 'viewer_user_1', profileId: 'viewer_prof_1' },
    explainability: {
      positiveChips: ['Social rhythm', 'Shared values'],
      reasonShort: 'Aligned',
    },
    recommendation: {
      primaryTakeaway: 'Strong overlap on lifestyle',
      suggestedNextAction: 'Start a conversation',
    },
  },
};

describe('AdminMatchQualityCandidatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCandidateAudit.mockResolvedValue(auditFixture);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders feedback summary and audit panel from mock', async () => {
    render(<AdminMatchQualityCandidatePage />);

    await waitFor(() => {
      expect(screen.getByText('3')).toBeTruthy();
    });
    expect(screen.getByText('74')).toBeTruthy();
    expect(
      screen.getByText('Your social energy levels are well-matched'),
    ).toBeTruthy();
    expect(screen.getByText('Strong overlap on lifestyle')).toBeTruthy();
    expect(screen.getByText('viewer_user_1')).toBeTruthy();
  });

  it('shows auditUnavailable message when audit is null', async () => {
    getCandidateAudit.mockResolvedValue({
      ...auditFixture,
      audit: null,
      auditUnavailable: {
        code: 'match_not_visible_to_viewer',
        message: 'Match detail not available for resolved viewer(s).',
      },
    });

    render(<AdminMatchQualityCandidatePage />);

    await waitFor(() => {
      expect(screen.getByText('Audit unavailable')).toBeTruthy();
    });
    expect(screen.getByText(/Match detail not available/)).toBeTruthy();
  });

  it('shows authorization error for admin_forbidden', async () => {
    getCandidateAudit.mockRejectedValue(new Error('admin_forbidden'));

    render(<AdminMatchQualityCandidatePage />);

    await waitFor(() => {
      expect(
        screen.getByText('You are not authorized to view match quality.'),
      ).toBeTruthy();
    });
  });

  it('links back to match quality dashboard', async () => {
    render(<AdminMatchQualityCandidatePage />);

    await waitFor(() => {
      expect(screen.getByRole('link', { name: '← Match quality' })).toBeTruthy();
    });
    expect(screen.getByRole('link', { name: '← Match quality' }).getAttribute('href')).toBe(
      '/admin/match-quality',
    );
  });
});
