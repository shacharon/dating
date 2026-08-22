/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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

vi.mock('@/components/notification-preferences-section', () => ({
  NotificationPreferencesSection: () => (
    <div data-testid="mock-notifications">notifications</div>
  ),
}));

vi.mock('@/components/dating-chapter-preferences-section', () => ({
  DatingChapterPreferencesSection: () => (
    <div data-testid="mock-dating-chapter">dating chapter</div>
  ),
}));

import { ProfileSettingsTab } from '@/components/profile/profile-settings-tab';

function renderSettingsTab() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(ProfileSettingsTab),
    ),
  );
}

describe('ProfileSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyProfile.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      nickname: 'Noa',
      partnerAgeMin: 25,
      partnerAgeMax: 35,
      maxDistanceKm: 50,
      desiredPartnerGenders: ['MALE', 'FEMALE'],
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('removes Account/Language links and keeps notifications', async () => {
    renderSettingsTab();
    await waitFor(() => {
      expect(screen.getByTestId('profile-settings-tab')).toBeTruthy();
    });
    expect(screen.getByTestId('mock-notifications')).toBeTruthy();
    expect(screen.queryByText(/Account/i)).toBeNull();
    expect(screen.queryByRole('link', { name: /language/i })).toBeNull();
    expect(
      document.querySelector('a[href="/settings/account"]'),
    ).toBeNull();
    expect(
      document.querySelector('a[href="/settings/language"]'),
    ).toBeNull();
  });

  it('shows CTA to /settings/preferences with testid', async () => {
    renderSettingsTab();
    const cta = await screen.findByTestId('profile-match-preferences-link');
    expect(cta.getAttribute('href')).toBe('/settings/preferences');
  });

  it('renders age, distance, and partner gender preview lines', async () => {
    renderSettingsTab();
    await waitFor(() => {
      expect(screen.getByText(/25–35/)).toBeTruthy();
    });
    expect(screen.getByText(/50 km/)).toBeTruthy();
    expect(screen.getByText(/Male/)).toBeTruthy();
  });
});
