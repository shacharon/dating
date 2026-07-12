/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('@/lib/me-profile-api', () => ({
  fetchMyProfile: vi.fn().mockResolvedValue({
    locationLabel: 'Tel Aviv',
    city: 'TLV',
  }),
}));

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'c123456789012345678901234' },
  }),
}));

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

import { MatchListEmptyState } from '@/components/match-list-empty-state';

describe('MatchListEmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
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

  it('copies invite link with ref query param', async () => {
    render(<MatchListEmptyState />);
    fireEvent.click(screen.getByTestId('match-empty-invite-copy'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3000/?ref=c123456789012345678901234',
      );
    });
  });
});
