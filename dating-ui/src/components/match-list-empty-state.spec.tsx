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

  it('renders action links and copy invite button', async () => {
    renderEmptyState();
    expect(screen.getByTestId('match-list-empty-state')).toBeTruthy();
    expect(screen.getByTestId('match-empty-edit-preferences').getAttribute('href')).toBe(
      '/settings/preferences',
    );
    expect(screen.getByTestId('match-empty-edit-profile').getAttribute('href')).toBe(
      '/profile',
    );
    expect(screen.getByTestId('match-empty-invite-copy')).toBeTruthy();
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
