/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyProfile, patchMyProfile, pushMock, searchParamsMock } = vi.hoisted(
  () => ({
    fetchMyProfile: vi.fn(),
    patchMyProfile: vi.fn(),
    pushMock: vi.fn(),
    searchParamsMock: vi.fn(() => new URLSearchParams()),
  }),
);

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  useSearchParams: () => searchParamsMock(),
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

  it('Skip opens Photos and does not patch', async () => {
    renderForm();
    fireEvent.click(await screen.findByTestId('onboarding-preferences-skip'));
    expect(patchMyProfile).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/onboarding/photos');
  });

  it('Skip in edit mode keeps the edit query', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams('edit=1'));
    renderForm();
    fireEvent.click(await screen.findByTestId('onboarding-preferences-skip'));
    expect(patchMyProfile).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/onboarding/photos?edit=1');
  });

  it('Continue with a valid age range patches and opens Photos', async () => {
    renderForm();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '25' },
    });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '40' },
    });
    fireEvent.click(screen.getByTestId('onboarding-preferences-continue'));

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith({
        partnerAgeMin: 25,
        partnerAgeMax: 40,
        maxDistanceKm: null,
      });
    });
    expect(pushMock).toHaveBeenCalledWith('/onboarding/photos');
  });

  it('Continue with min greater than max stays and does not patch', async () => {
    renderForm();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByTestId('pref-age-max'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('onboarding-preferences-continue'));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      enCopy.matchPreferences.ageRangeInvalid,
    );
    expect(patchMyProfile).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('Skip discards typed ages and does not patch', async () => {
    renderForm();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '18' },
    });
    fireEvent.change(screen.getByTestId('pref-max-distance'), {
      target: { value: '50' },
    });
    fireEvent.click(screen.getByTestId('onboarding-preferences-skip'));
    expect(patchMyProfile).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/onboarding/photos');
  });

  it('Continue with both ages empty saves nulls', async () => {
    renderForm();
    fireEvent.click(await screen.findByTestId('onboarding-preferences-continue'));
    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith({
        partnerAgeMin: null,
        partnerAgeMax: null,
        maxDistanceKm: null,
      });
    });
    expect(pushMock).toHaveBeenCalledWith('/onboarding/photos');
  });

  it('Continue with one age filled is allowed', async () => {
    renderForm();
    fireEvent.change(await screen.findByTestId('pref-age-min'), {
      target: { value: '25' },
    });
    fireEvent.click(screen.getByTestId('onboarding-preferences-continue'));
    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith({
        partnerAgeMin: 25,
        partnerAgeMax: null,
        maxDistanceKm: null,
      });
    });
    expect(screen.queryByRole('alert')).toBeNull();
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
    fireEvent.click(screen.getByTestId('onboarding-preferences-continue'));
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
    expect(body).not.toHaveProperty('onboardingStep');
  });

  it('stays on the page when the patch fails', async () => {
    patchMyProfile.mockRejectedValue(new Error('nope'));
    renderForm();
    fireEvent.click(await screen.findByTestId('onboarding-preferences-continue'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(
      enCopy.matchPreferences.saveError,
    );
    expect(pushMock).not.toHaveBeenCalled();
  });
});
