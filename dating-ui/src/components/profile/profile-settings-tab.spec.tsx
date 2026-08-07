/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { resolveEditableProfile } = vi.hoisted(() => ({
  resolveEditableProfile: vi.fn(),
}));

vi.mock('@/lib/profile-form', async () => {
  const actual = await vi.importActual<typeof import('@/lib/profile-form')>(
    '@/lib/profile-form',
  );
  return {
    ...actual,
    resolveEditableProfile,
  };
});

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

describe('ProfileSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveEditableProfile.mockResolvedValue({
      nickname: 'Noa',
      partnerAgeMin: 25,
      partnerAgeMax: 35,
      maxDistanceKm: 50,
      desiredPartnerGenders: ['MALE', 'FEMALE'],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('removes Account/Language links and keeps notifications', async () => {
    render(<ProfileSettingsTab />);
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
    render(<ProfileSettingsTab />);
    const cta = await screen.findByTestId('profile-match-preferences-link');
    expect(cta.getAttribute('href')).toBe('/settings/preferences');
  });

  it('renders age, distance, and partner gender preview lines', async () => {
    render(<ProfileSettingsTab />);
    await waitFor(() => {
      expect(screen.getByText(/25–35/)).toBeTruthy();
    });
    expect(screen.getByText(/50 km/)).toBeTruthy();
    expect(screen.getByText(/Male/)).toBeTruthy();
  });
});
