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

import { ProfileEditPreferencesSection } from '@/components/profile/profile-edit-preferences-section';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';

const baseProfile = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'BASIC',
  aboutMe: null,
  aboutPartner: null,
  aboutRelationship: null,
  desiredPartnerGenders: ['FEMALE'],
  partnerAgeMin: null as number | null,
  partnerAgeMax: null as number | null,
  maxDistanceKm: null as number | null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function renderSection(onSaved = vi.fn()) {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(ProfileEditPreferencesSection, { onSaved }),
    ),
  );
}

describe('ProfileEditPreferencesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
    fetchMyProfile.mockResolvedValue({ ...baseProfile });
    patchMyProfile.mockImplementation(async (body: Record<string, unknown>) => ({
      ...baseProfile,
      ...body,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('shows saved age and distance after reload', async () => {
    fetchMyProfile.mockResolvedValue({
      ...baseProfile,
      partnerAgeMin: 25,
      partnerAgeMax: 40,
      maxDistanceKm: 15,
    });
    renderSection();
    const min = await screen.findByTestId('pref-age-min');
    await waitFor(() => {
      expect((min as HTMLInputElement).value).toBe('25');
    });
    expect((screen.getByTestId('pref-age-max') as HTMLInputElement).value).toBe(
      '40',
    );
    expect(
      (screen.getByTestId('pref-max-distance') as HTMLInputElement).value,
    ).toBe('15');
    expect(screen.queryByTestId('pref-gender-FEMALE')).toBeNull();
  });

  it('saves a range and a distance without partner genders', async () => {
    const onSaved = vi.fn();
    renderSection(onSaved);
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByTestId('pref-max-distance'), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByTestId('profile-edit-preferences-save'));

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalled();
    });
    const body = patchMyProfile.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(body).toEqual({
      partnerAgeMin: 25,
      partnerAgeMax: 40,
      maxDistanceKm: 15,
    });
    expect(body).not.toHaveProperty('desiredPartnerGenders');
    expect(body).not.toHaveProperty('onboardingStep');
    expect(onSaved).toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toBe(
      enCopy.onboarding.savedFlash,
    );
  });

  it('clearing both ages and distance saves null', async () => {
    fetchMyProfile.mockResolvedValue({
      ...baseProfile,
      partnerAgeMin: 25,
      partnerAgeMax: 40,
      maxDistanceKm: 15,
    });
    renderSection();
    const min = await screen.findByTestId('pref-age-min');
    await waitFor(() => {
      expect((min as HTMLInputElement).value).toBe('25');
    });
    fireEvent.change(min, { target: { value: '' } });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByTestId('pref-max-distance'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByTestId('profile-edit-preferences-save'));

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith({
        partnerAgeMin: null,
        partnerAgeMax: null,
        maxDistanceKm: null,
      });
    });
  });

  it('does not save when min is greater than max', async () => {
    renderSection();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('profile-edit-preferences-save'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      enCopy.matchPreferences.ageRangeInvalid,
    );
    expect(patchMyProfile).not.toHaveBeenCalled();
  });

  it('does not save when there is no profile', async () => {
    fetchMyProfile.mockResolvedValue(null);
    renderSection();
    const save = await screen.findByTestId('profile-edit-preferences-save');
    expect((save as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(save);
    expect(patchMyProfile).not.toHaveBeenCalled();
  });

  it('saves when only one age is filled', async () => {
    renderSection();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('profile-edit-preferences-save'));
    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith({
        partnerAgeMin: 25,
        partnerAgeMax: null,
        maxDistanceKm: null,
      });
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('stays on the page when the save fails', async () => {
    const onSaved = vi.fn();
    patchMyProfile.mockRejectedValue(new Error('nope'));
    renderSection(onSaved);
    fireEvent.click(await screen.findByTestId('profile-edit-preferences-save'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      enCopy.matchPreferences.saveError,
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
