/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyProfile, patchMyProfile, createMyProfile } = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  patchMyProfile: vi.fn(),
  createMyProfile: vi.fn(),
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

vi.mock('@/lib/profile/country-from-timezone', () => ({
  guessOnboardingCountryCode: () => 'IL',
  countryCodeFromTimeZone: () => 'IL',
}));

const pushMock = vi.fn();
const replaceMock = vi.fn();
const searchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsMock(),
}));

import { OnboardingFactsForm } from '@/components/onboarding-facts-form';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import type { MeProfileDto } from '@/lib/api/me-profile-api';

const emptyProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'BASIC',
  aboutMe: null,
  aboutPartner: null,
  aboutRelationship: null,
  gender: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function renderForm() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(OnboardingFactsForm),
    ),
  );
}

describe('OnboardingFactsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
    searchParamsMock.mockReturnValue(new URLSearchParams());
    fetchMyProfile.mockResolvedValue(emptyProfile);
    patchMyProfile.mockImplementation(async (body) => ({
      ...emptyProfile,
      ...body,
    }));
    createMyProfile.mockImplementation(async (body) => ({
      ...emptyProfile,
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
        {
          id: 'city_IL_na_tel_aviv',
          nameEn: 'Tel Aviv',
          nameHe: 'תל אביב-יפו',
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  it('shows four field labels and no nickname / dating chapter', async () => {
    renderForm();
    const ff = enCopy.onboarding.factsForm;
    const bf = enCopy.onboarding.basicForm;

    await waitFor(() => {
      expect(screen.getByText(ff.iAmLabel)).toBeTruthy();
      expect(screen.getByText(ff.lookingForLabel)).toBeTruthy();
      expect(screen.getByText(ff.whereLabel)).toBeTruthy();
      expect(screen.getByLabelText(ff.birthDateLabel)).toBeTruthy();
    });

    expect(screen.queryByLabelText(bf.nicknameLabel)).toBeNull();
    expect(screen.queryByText(bf.datingChapter.question)).toBeNull();
  });

  it('keeps Continue disabled with missing hints until fields are filled', async () => {
    renderForm();
    const ff = enCopy.onboarding.factsForm;

    await waitFor(() => {
      expect(
        (screen.getByTestId('onboarding-facts-continue') as HTMLButtonElement)
          .disabled,
      ).toBe(true);
    });
    expect(screen.getByText(new RegExp(ff.missingHeading))).toBeTruthy();
    expect(screen.getByText(new RegExp(ff.missingGender))).toBeTruthy();
  });

  it('Continue patches TEXTS with partners and navigates to photos', async () => {
    fetchMyProfile.mockResolvedValue({
      ...emptyProfile,
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'],
      birthDate: '1990-05-01',
      country: 'IL',
      cityId: 'city_IL_na_tel_aviv',
    });

    renderForm();

    await waitFor(() => {
      expect(
        (screen.getByTestId('onboarding-facts-continue') as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    });

    fireEvent.click(screen.getByTestId('onboarding-facts-continue'));

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          birthDate: '1990-05-01',
          country: 'IL',
          cityId: 'city_IL_na_tel_aviv',
          onboardingStep: 'TEXTS',
        }),
      );
      expect(pushMock).toHaveBeenCalledWith('/onboarding/photos');
    });
  });
});
