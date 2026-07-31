/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ProfileDraft } from '@/app/dating/_lib/types';

const { listMyProfilePhotosMock } = vi.hoisted(() => ({
  listMyProfilePhotosMock: vi.fn(),
}));

vi.mock('@/lib/me-photos-api', () => ({
  listMyProfilePhotos: listMyProfilePhotosMock,
}));

import { ProfileCompletenessHints } from '@/components/profile-completeness-hints';

const completeDraft: ProfileDraft = {
  nickname: 'River',
  aboutMe: 'About me',
  aboutPartner: 'About partner',
  aboutRelationship: 'About relationship',
  birthDate: '1990-01-01',
  gender: 'FEMALE',
  desiredPartnerGenders: ['MALE'],
  city: 'TLV',
  country: 'IL',
  locationLabel: 'Tel Aviv',
};

describe('ProfileCompletenessHints', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    listMyProfilePhotosMock.mockResolvedValue([
      { id: 'p1', status: 'APPROVED', position: 0, isPrimary: true },
    ]);
  });

  it('marks all rows complete when photo, basics, and story are satisfied', async () => {
    render(<ProfileCompletenessHints draft={completeDraft} />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-completeness-hints')).toBeTruthy();
    });

    expect(screen.getByTestId('profile-completeness-photo').textContent).toContain(
      'Complete',
    );
    expect(screen.getByTestId('profile-completeness-basics').textContent).toContain(
      'Complete',
    );
    expect(screen.getByTestId('profile-completeness-story').textContent).toContain(
      'Complete',
    );
  });

  it('marks photo incomplete when no approved photos', async () => {
    listMyProfilePhotosMock.mockResolvedValue([]);

    render(<ProfileCompletenessHints draft={completeDraft} />);

    await waitFor(() => {
      expect(screen.getByTestId('profile-completeness-photo').textContent).toContain(
        'Incomplete',
      );
    });
  });
});
