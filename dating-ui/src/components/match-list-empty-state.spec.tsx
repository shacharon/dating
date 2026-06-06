/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/me-profile-api', () => ({
  fetchMyProfile: vi.fn().mockResolvedValue({
    locationLabel: 'Tel Aviv',
    city: 'TLV',
  }),
}));

import { MatchListEmptyState } from '@/components/match-list-empty-state';

describe('MatchListEmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders action links and copy invite button', async () => {
    render(<MatchListEmptyState />);
    expect(screen.getByTestId('match-list-empty-state')).toBeTruthy();
    expect(screen.getByTestId('match-empty-edit-preferences').getAttribute('href')).toBe(
      '/settings/preferences',
    );
    expect(screen.getByTestId('match-empty-edit-profile').getAttribute('href')).toBe(
      '/dating/profile',
    );
    expect(screen.getByTestId('match-empty-invite-copy')).toBeTruthy();
  });
});
