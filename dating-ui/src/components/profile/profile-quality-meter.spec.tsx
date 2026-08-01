/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const { fetchProfileQualityMock } = vi.hoisted(() => ({
  fetchProfileQualityMock: vi.fn(),
}));

vi.mock('@/lib/profile-quality-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/profile-quality-api')>(
    '@/lib/profile-quality-api',
  );
  return {
    ...actual,
    fetchProfileQuality: fetchProfileQualityMock,
  };
});

import { ProfileQualityMeter } from '@/components/profile/profile-quality-meter';

const copy = {
  meterLabel: 'Profile quality',
  meterImprove: 'Improve profile',
  meterLoading: 'Checking profile quality…',
  meterUnavailable: 'Quality score unavailable',
  suggestionPhoto: 'Add a photo',
  suggestionBasics: 'Complete basic info',
  suggestionNickname: 'Add a nickname',
  suggestionLocation: 'Add location',
  suggestionAboutMe: 'Write about yourself',
  suggestionAboutPartner: 'Describe your ideal partner',
  suggestionAboutRelationship: 'Add relationship goals',
} as const;

describe('ProfileQualityMeter', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then API score and chips', async () => {
    fetchProfileQualityMock.mockResolvedValue({
      score: 75,
      completeness: {
        hasNickname: true,
        hasLocation: true,
        hasBasics: true,
        hasAboutMe: true,
        hasAboutPartner: false,
        hasAboutRelationship: false,
        hasApprovedPhoto: true,
      },
      suggestions: [
        { id: 'aboutPartner', points: 20 },
        { id: 'aboutRelationship', points: 15 },
        { id: 'nickname', points: 10 },
      ],
    });

    render(<ProfileQualityMeter copy={copy as never} />);

    expect(screen.getByText('Checking profile quality…')).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText(/75%/)).toBeTruthy();
    });

    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '75',
    );
    expect(screen.getByTestId('profile-quality-chip-aboutPartner')).toBeTruthy();
    expect(
      screen.getByTestId('profile-quality-chip-aboutRelationship'),
    ).toBeTruthy();
    expect(screen.queryByTestId('profile-quality-chip-nickname')).toBeNull();
  });

  it('shows unavailable when fetch fails', async () => {
    fetchProfileQualityMock.mockRejectedValue(new Error('404'));

    render(<ProfileQualityMeter copy={copy as never} />);

    await waitFor(() => {
      expect(screen.getByText('Quality score unavailable')).toBeTruthy();
    });
  });

  it('refetches when refreshKey changes', async () => {
    fetchProfileQualityMock
      .mockResolvedValueOnce({
        score: 40,
        completeness: {
          hasNickname: true,
          hasLocation: false,
          hasBasics: true,
          hasAboutMe: false,
          hasAboutPartner: false,
          hasAboutRelationship: false,
          hasApprovedPhoto: false,
        },
        suggestions: [{ id: 'photo', points: 15 }],
      })
      .mockResolvedValueOnce({
        score: 55,
        completeness: {
          hasNickname: true,
          hasLocation: false,
          hasBasics: true,
          hasAboutMe: false,
          hasAboutPartner: false,
          hasAboutRelationship: false,
          hasApprovedPhoto: true,
        },
        suggestions: [{ id: 'location', points: 10 }],
      });

    const { rerender } = render(
      <ProfileQualityMeter copy={copy as never} refreshKey={0} />,
    );

    await waitFor(() => {
      expect(screen.getByText(/40%/)).toBeTruthy();
    });

    rerender(<ProfileQualityMeter copy={copy as never} refreshKey={1} />);

    await waitFor(() => {
      expect(screen.getByText(/55%/)).toBeTruthy();
    });
    expect(fetchProfileQualityMock).toHaveBeenCalledTimes(2);
  });
});
