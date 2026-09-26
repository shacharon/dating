/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyProfile, patchMyProfile, createMyProfile, pushMock, searchParamsMock } =
  vi.hoisted(() => ({
    fetchMyProfile: vi.fn(),
    patchMyProfile: vi.fn(),
    createMyProfile: vi.fn(),
    pushMock: vi.fn(),
    searchParamsMock: vi.fn(() => new URLSearchParams()),
  }));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    profile: {
      fetchMyProfile,
      patchMyProfile,
      createMyProfile,
      submitMyProfileForAnalysis: vi.fn(),
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => searchParamsMock(),
}));

const { listPlaceCountries, listPlaceUsStates, listPlaceCities } = vi.hoisted(
  () => ({
    listPlaceCountries: vi.fn(),
    listPlaceUsStates: vi.fn(),
    listPlaceCities: vi.fn(),
  }),
);

vi.mock('@/lib/api/places-api', () => ({
  listPlaceCountries,
  listPlaceUsStates,
  listPlaceCities,
}));

import { OnboardingPreferencesForm } from '@/components/onboarding/onboarding-preferences-form';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';

function renderForm() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(OnboardingPreferencesForm),
    ),
  );
}

describe('OnboardingPreferencesForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
    searchParamsMock.mockReturnValue(new URLSearchParams());
    fetchMyProfile.mockResolvedValue(null);
    patchMyProfile.mockResolvedValue({});
    createMyProfile.mockImplementation(async (body) => ({
      id: 'p1',
      userId: 'u1',
      ...body,
    }));
    listPlaceCountries.mockResolvedValue({
      countries: [
        { code: 'IL', nameEn: 'Israel' },
        { code: 'US', nameEn: 'United States' },
      ],
    });
    listPlaceUsStates.mockResolvedValue({ states: [] });
    listPlaceCities.mockResolvedValue({
      cities: [
        { id: 'city_IL_na_tel_aviv', nameEn: 'Tel Aviv', nameHe: 'תל אביב-יפו' },
        { id: 'city_US_ny_nyc', nameEn: 'New York', nameHe: null },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows age range and distance only', async () => {
    renderForm();
    expect(await screen.findByTestId('pref-age-min')).toBeTruthy();
    expect(screen.getByTestId('pref-age-max')).toBeTruthy();
    expect(screen.getByTestId('pref-max-distance')).toBeTruthy();
    expect(screen.queryByTestId('pref-gender-FEMALE')).toBeNull();
    expect(screen.getByText(enCopy.onboarding.preferencesStep.optionalHint)).toBeTruthy();
  });

  it('has no Skip or Continue buttons', async () => {
    renderForm();
    await screen.findByTestId('pref-age-min');
    expect(screen.queryByTestId('onboarding-preferences-skip')).toBeNull();
    expect(screen.queryByTestId('onboarding-preferences-continue')).toBeNull();
  });

  it('saves age and distance when a field blurs', async () => {
    renderForm();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '40' },
    });
    fireEvent.blur(screen.getByTestId('pref-age-max'));

    await waitFor(() => {
      expect(createMyProfile).toHaveBeenCalledWith({
        partnerAgeMin: 25,
        partnerAgeMax: 40,
        maxDistanceKm: null,
      });
    });
    expect(await screen.findByText(enCopy.onboarding.savedFlash)).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('does not save when min is greater than max', async () => {
    renderForm();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '25' },
    });
    fireEvent.blur(screen.getByTestId('pref-age-max'));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      enCopy.matchPreferences.ageRangeInvalid,
    );
    expect(createMyProfile).not.toHaveBeenCalled();
  });

  it('saves one age on blur', async () => {
    renderForm();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '25' },
    });
    fireEvent.blur(screen.getByTestId('pref-age-min'));
    await waitFor(() => {
      expect(createMyProfile).toHaveBeenCalledWith({
        partnerAgeMin: 25,
        partnerAgeMax: null,
        maxDistanceKm: null,
      });
    });
  });

  it('does not send partner genders when the profile already has them', async () => {
    fetchMyProfile.mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
      desiredPartnerGenders: ['FEMALE'],
      partnerAgeMin: 28,
      partnerAgeMax: 40,
      maxDistanceKm: 15,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    });
    renderForm();
    const min = await screen.findByTestId('pref-age-min');
    await waitFor(() => {
      expect((min as HTMLInputElement).value).toBe('28');
    });
    fireEvent.blur(min);
    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalled();
    });
    const body = patchMyProfile.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(body).toEqual({
      partnerAgeMin: 28,
      partnerAgeMax: 40,
      maxDistanceKm: 15,
    });
    expect(body).not.toHaveProperty('desiredPartnerGenders');
  });

  it('shows a save error and stays on the page when the patch fails', async () => {
    createMyProfile.mockRejectedValue(new Error('nope'));
    renderForm();
    fireEvent.blur(await screen.findByTestId('pref-age-min'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      enCopy.matchPreferences.saveError,
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('Done with an empty form opens Matches', async () => {
    renderForm();
    fireEvent.click(await screen.findByTestId('onboarding-preferences-done'));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/dating/me-matches');
    });
    const body = createMyProfile.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(body).toEqual({
      partnerAgeMin: null,
      partnerAgeMax: null,
      maxDistanceKm: null,
    });
    expect(body).not.toHaveProperty('onboardingStep');
    expect(screen.getByTestId('onboarding-preferences-done').textContent).toBe(
      enCopy.onboarding.preferencesStep.done,
    );
  });

  it('Done stays on Preferences when the save fails', async () => {
    createMyProfile.mockRejectedValue(new Error('nope'));
    renderForm();
    fireEvent.click(await screen.findByTestId('onboarding-preferences-done'));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      enCopy.matchPreferences.saveError,
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('Done does not leave when the age range is invalid', async () => {
    renderForm();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('onboarding-preferences-done'));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      enCopy.matchPreferences.ageRangeInvalid,
    );
    expect(createMyProfile).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('Hebrew shows Israeli cities and no country list', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderForm();
    const city = await screen.findByTestId('pref-city');
    await waitFor(() => {
      expect(listPlaceCities).toHaveBeenCalledWith('IL', undefined);
    });
    expect(screen.queryByTestId('pref-country')).toBeNull();
    expect(await screen.findByRole('option', { name: 'תל אביב-יפו' })).toBeTruthy();
    fireEvent.change(city, { target: { value: 'city_IL_na_tel_aviv' } });
    await waitFor(() => {
      expect(createMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'IL',
          cityId: 'city_IL_na_tel_aviv',
          usStateCode: null,
        }),
      );
    });
  });

  it('English can pick a country and a city', async () => {
    renderForm();
    const country = await screen.findByTestId('pref-country');
    await waitFor(() => {
      expect((country as HTMLSelectElement).value).toBe('US');
    });
    fireEvent.change(country, { target: { value: 'IL' } });
    const city = await screen.findByTestId('pref-city');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Tel Aviv' })).toBeTruthy();
    });
    fireEvent.change(city, { target: { value: 'city_IL_na_tel_aviv' } });
    await waitFor(() => {
      const calls = [
        ...createMyProfile.mock.calls,
        ...patchMyProfile.mock.calls,
      ];
      expect(
        calls.some(
          (call) =>
            call[0].country === 'IL' && call[0].cityId === 'city_IL_na_tel_aviv',
        ),
      ).toBe(true);
    });
  });
});
