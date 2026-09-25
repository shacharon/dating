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

  it('shows nickname first, then the four facts, and no dating chapter', async () => {
    renderForm();
    const ff = enCopy.onboarding.factsForm;
    const bf = enCopy.onboarding.basicForm;

    await waitFor(() => {
      expect(screen.getByText(ff.iAmLabel)).toBeTruthy();
      expect(screen.getByText(ff.lookingForLabel)).toBeTruthy();
      expect(screen.getByText(ff.whereLabel)).toBeTruthy();
      expect(screen.getByLabelText(ff.birthDateLabel)).toBeTruthy();
    });

    expect(screen.getByLabelText(bf.nicknameLabel)).toBeTruthy();
    expect(screen.queryByText(bf.datingChapter.question)).toBeNull();
  });

  it('shows missing hints and no Continue button', async () => {
    renderForm();
    const ff = enCopy.onboarding.factsForm;

    await waitFor(() => {
      expect(screen.getByText(new RegExp(ff.missingHeading))).toBeTruthy();
    });
    expect(screen.queryByTestId('onboarding-facts-continue')).toBeNull();
    expect(screen.getByText(new RegExp(ff.missingGender))).toBeTruthy();
  });

  it('saves complete facts when a field changes and stays on the page', async () => {
    fetchMyProfile.mockResolvedValue({
      ...emptyProfile,
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'],
      birthDate: '1990-05-01',
      country: 'IL',
      cityId: 'city_IL_na_tel_aviv',
    });

    renderForm();
    const ff = enCopy.onboarding.factsForm;

    const birth = await screen.findByLabelText(ff.birthDateLabel);
    await waitFor(() => {
      expect((birth as HTMLInputElement).value).toBe('1990-05-01');
    });

    fireEvent.change(birth, { target: { value: '1991-05-01' } });

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          birthDate: '1991-05-01',
          country: 'IL',
          cityId: 'city_IL_na_tel_aviv',
          onboardingStep: 'TEXTS',
        }),
      );
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('saves everyone as all partner genders when a field changes', async () => {
    fetchMyProfile.mockResolvedValue({
      ...emptyProfile,
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER'],
      birthDate: '1992-01-15',
      country: 'IL',
      cityId: 'city_IL_na_tel_aviv',
    });

    renderForm();
    const ff = enCopy.onboarding.factsForm;
    const birth = await screen.findByLabelText(ff.birthDateLabel);
    await waitFor(() => {
      expect((birth as HTMLInputElement).value).toBe('1992-01-15');
    });
    fireEvent.change(birth, { target: { value: '1992-02-15' } });

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          desiredPartnerGenders: ['MALE', 'FEMALE', 'NON_BINARY', 'OTHER'],
          onboardingStep: 'TEXTS',
        }),
      );
    });
    const partners = patchMyProfile.mock.calls.at(-1)?.[0]
      .desiredPartnerGenders as string[];
    expect(partners).not.toContain('PREFER_NOT_TO_SAY');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('omits desiredPartnerGenders when none are selected', async () => {
    fetchMyProfile.mockResolvedValue({
      ...emptyProfile,
      gender: 'MALE',
      desiredPartnerGenders: [],
      birthDate: '1990-05-01',
      country: 'IL',
      cityId: 'city_IL_na_tel_aviv',
    });

    renderForm();
    const ff = enCopy.onboarding.factsForm;
    const birth = await screen.findByLabelText(ff.birthDateLabel);
    await waitFor(() => {
      expect((birth as HTMLInputElement).value).toBe('1990-05-01');
    });
    fireEvent.change(birth, { target: { value: '1991-05-01' } });

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalled();
    });
    const body = patchMyProfile.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(body).not.toHaveProperty('desiredPartnerGenders');
    expect(body.birthDate).toBe('1991-05-01');
  });

  it('creates a profile when none exists yet', async () => {
    fetchMyProfile.mockResolvedValue(null);

    renderForm();
    const ff = enCopy.onboarding.factsForm;
    const bf = enCopy.onboarding.basicForm;

    await waitFor(() => {
      expect(screen.getByRole('button', { name: enCopy.gender.MALE })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: enCopy.gender.MALE }));
    fireEvent.click(screen.getByRole('button', { name: ff.lookingForWomen }));
    await waitFor(() => {
      expect(screen.getByLabelText(bf.countryLabel)).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText(bf.countryLabel), {
      target: { value: 'IL' },
    });
    fireEvent.change(screen.getByLabelText(ff.birthDateLabel), {
      target: { value: '1990-05-01' },
    });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Tel Aviv' })).toBeTruthy();
    });
    fireEvent.change(screen.getByLabelText(bf.cityLabel), {
      target: { value: 'city_IL_na_tel_aviv' },
    });

    await waitFor(() => {
      const calls = [
        ...createMyProfile.mock.calls,
        ...patchMyProfile.mock.calls,
      ];
      const saved = calls.some(
        (call) =>
          call[0].gender === 'MALE' &&
          call[0].cityId === 'city_IL_na_tel_aviv' &&
          call[0].onboardingStep === 'TEXTS',
      );
      expect(saved).toBe(true);
    });
    expect(pushMock).not.toHaveBeenCalled();
  });
});
