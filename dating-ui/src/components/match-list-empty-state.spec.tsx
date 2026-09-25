/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyProfile } = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    profile: {
      fetchMyProfile,
      patchMyProfile: vi.fn(),
      createMyProfile: vi.fn(),
      submitMyProfileForAnalysis: vi.fn(),
    },
  },
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

function renderEmptyState() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(MatchListEmptyState),
    ),
  );
}

describe('MatchListEmptyState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyProfile.mockResolvedValue({
      locationLabel: 'Tel Aviv',
      city: 'TLV',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the invite button and hides profile edit links', async () => {
    renderEmptyState();
    expect(screen.getByTestId('match-list-empty-state')).toBeTruthy();
    expect(screen.queryByTestId('match-empty-edit-preferences')).toBeNull();
    expect(screen.queryByTestId('match-empty-edit-profile')).toBeNull();
    expect(screen.queryByTestId('match-empty-update-profile')).toBeNull();
    expect(screen.getByTestId('match-empty-invite-copy')).toBeTruthy();
  });

  it('shows Update profile while analysis is running', async () => {
    fetchMyProfile.mockResolvedValue({
      locationLabel: 'Tel Aviv',
      status: 'ANALYZING',
    });
    renderEmptyState();
    const link = await screen.findByTestId('match-empty-update-profile');
    expect(link.getAttribute('href')).toBe('/profile/edit');
    expect(link.textContent).toBe('Update profile');
  });

  it('copies invite link with ref query param', async () => {
    renderEmptyState();
    fireEvent.click(screen.getByTestId('match-empty-invite-copy'));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3000/?ref=c123456789012345678901234',
      );
    });
  });
});
