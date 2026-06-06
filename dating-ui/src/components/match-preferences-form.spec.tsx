/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { fetchMyProfile, patchMyProfile } = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  patchMyProfile: vi.fn(),
}));

vi.mock('@/lib/me-profile-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/me-profile-api')>();
  return {
    ...actual,
    fetchMyProfile,
    patchMyProfile,
  };
});

import { MatchPreferencesForm } from '@/components/match-preferences-form';
import type { MeProfileDto } from '@/lib/me-profile-api';

const mockProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'COMPLETED',
  aboutMe: 'Hello',
  aboutPartner: 'Kind',
  aboutRelationship: 'Long term',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  desiredPartnerGenders: ['FEMALE'],
  partnerAgeMin: 25,
  partnerAgeMax: 35,
};

describe('MatchPreferencesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMyProfile.mockResolvedValue(mockProfile);
    patchMyProfile.mockImplementation(async (body) => ({
      ...mockProfile,
      ...body,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('loads profile and renders preference fields', async () => {
    render(<MatchPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByTestId('pref-age-min').getAttribute('value')).toBe('25');
      expect(screen.getByTestId('pref-age-max').getAttribute('value')).toBe('35');
      expect(
        (screen.getByTestId('pref-gender-FEMALE') as HTMLInputElement).checked,
      ).toBe(true);
    });
  });

  it('patches preferences on save', async () => {
    render(<MatchPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByTestId('match-prefs-save')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('pref-age-min'), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByTestId('match-prefs-save'));

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          desiredPartnerGenders: ['FEMALE'],
          partnerAgeMin: 30,
          partnerAgeMax: 35,
        }),
      );
      expect(screen.getByTestId('match-prefs-save-success')).toBeTruthy();
    });
  });

  it('shows validation error when partner genders are cleared', async () => {
    render(<MatchPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByTestId('pref-gender-FEMALE')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('pref-gender-FEMALE'));
    fireEvent.click(screen.getByTestId('match-prefs-save'));

    await waitFor(() => {
      expect(patchMyProfile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain(
        'Select at least one gender',
      );
    });
  });

  it('shows validation error when age min exceeds max', async () => {
    render(<MatchPreferencesForm />);

    await waitFor(() => {
      expect(screen.getByTestId('pref-age-min')).toBeTruthy();
    });

    fireEvent.change(screen.getByTestId('pref-age-min'), {
      target: { value: '50' },
    });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '30' },
    });
    fireEvent.click(screen.getByTestId('match-prefs-save'));

    await waitFor(() => {
      expect(patchMyProfile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain(
        'Minimum age must be less than or equal to maximum age',
      );
    });
  });
});
