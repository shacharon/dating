/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyProfile, patchMyProfile } = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  patchMyProfile: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    profile: {
      fetchMyProfile,
      patchMyProfile,
      createMyProfile: vi.fn(),
      submitMyProfileForAnalysis: vi.fn(),
    },
  },
}));

import { MatchPreferencesForm } from '@/components/match-preferences-form';
import type { MeProfileDto } from '@/lib/api/me-profile-api';

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

function renderForm(props?: { showTitle?: boolean }) {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(MatchPreferencesForm, props ?? {}),
    ),
  );
}

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
    renderForm();

    await waitFor(() => {
      expect(screen.getByTestId('pref-age-min').getAttribute('value')).toBe('25');
      expect(screen.getByTestId('pref-age-max').getAttribute('value')).toBe('35');
      expect(
        (screen.getByTestId('pref-gender-FEMALE') as HTMLInputElement).checked,
      ).toBe(true);
    });
  });

  it('does not render removed lifestyle/education/family/similarity controls', async () => {
    renderForm({ showTitle: true });

    await waitFor(() => {
      expect(screen.getByTestId('pref-age-min')).toBeTruthy();
    });

    expect(screen.queryByTestId('pref-education')).toBeNull();
    expect(screen.queryByTestId('pref-smoking-ANY')).toBeNull();
    expect(screen.queryByTestId('pref-alcohol-ANY')).toBeNull();
    expect(screen.queryByTestId('pref-religion-JEWISH')).toBeNull();
    expect(screen.queryByTestId('pref-wants-children')).toBeNull();
    expect(screen.queryByTestId('pref-has-children')).toBeNull();
    expect(screen.queryByTestId('pref-similarity')).toBeNull();
    expect(screen.queryByText('Minimum education')).toBeNull();
    expect(screen.queryByText('Lifestyle')).toBeNull();
    expect(screen.queryByText('Family')).toBeNull();
  });

  it('patches preferences on save', async () => {
    renderForm();

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
    renderForm();

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
    renderForm();

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
