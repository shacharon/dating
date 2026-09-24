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

const { listMyProfilePhotos } = vi.hoisted(() => ({
  listMyProfilePhotos: vi.fn(),
}));

vi.mock('@/lib/api/me-photos-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/me-photos-api')>();
  return {
    ...actual,
    listMyProfilePhotos,
  };
});

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

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { displayName: 'Test User' } }),
}));

const pushMock = vi.fn();
const replaceMock = vi.fn();
const searchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsMock(),
}));

import { OnboardingBasicForm } from '@/components/onboarding-basic-form';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';
import type { MeProfileDto } from '@/lib/api/me-profile-api';

const basicProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'BASIC',
  aboutMe: null,
  aboutPartner: null,
  aboutRelationship: null,
  gender: 'MALE',
  desiredPartnerGenders: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function renderHubForm() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(OnboardingBasicForm, { variant: 'profileHub' }),
    ),
  );
}

describe('OnboardingBasicForm (profile hub)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
    searchParamsMock.mockReturnValue(new URLSearchParams());
    fetchMyProfile.mockResolvedValue(basicProfile);
    patchMyProfile.mockImplementation(async (body) => ({
      ...basicProfile,
      ...body,
    }));
    listMyProfilePhotos.mockResolvedValue([]);
    listPlaceCountries.mockResolvedValue({ countries: [] });
    listPlaceUsStates.mockResolvedValue({ states: [] });
    listPlaceCities.mockResolvedValue({ cities: [] });
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  it('renders required fields without nickname or dating chapter', async () => {
    renderHubForm();

    await waitFor(() => {
      expect(screen.getByLabelText(enCopy.onboarding.basicForm.genderLabel)).toBeTruthy();
      expect(screen.getByLabelText(enCopy.onboarding.basicForm.birthDateLabel)).toBeTruthy();
    });
    expect(
      screen.queryByLabelText(enCopy.onboarding.basicForm.nicknameLabel),
    ).toBeNull();
    expect(
      screen.queryByText(enCopy.onboarding.basicForm.datingChapter.question),
    ).toBeNull();
    expect(
      screen.queryByText(enCopy.onboarding.basicForm.googleNameLabel),
    ).toBeNull();
    expect(
      screen.queryByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
    ).toBeNull();
  });

  it('shows localized partner-gender validation on hub save', async () => {
    renderHubForm();

    await waitFor(() => {
      expect(
        (document.getElementById('onb-gender') as HTMLSelectElement).value,
      ).toBe('MALE');
    });

    fireEvent.click(screen.getByTestId('profile-hub-basic-save'));

    await waitFor(() => {
      expect(patchMyProfile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain(
        enCopy.onboarding.basicForm.partnerGendersRequiredError,
      );
    });
  });

  it('shows Hebrew partner-gender validation when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderHubForm();

    await waitFor(() => {
      expect(
        (document.getElementById('onb-gender') as HTMLSelectElement).value,
      ).toBe('MALE');
    });

    fireEvent.click(screen.getByTestId('profile-hub-basic-save'));

    await waitFor(() => {
      expect(patchMyProfile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain(
        heCopy.onboarding.basicForm.partnerGendersRequiredError,
      );
    });
  });

  it('fetches countries for hub variant', async () => {
    renderHubForm();

    await waitFor(() => {
      expect(listPlaceCountries).toHaveBeenCalled();
    });
  });

  it('hub save progress PATCH omits nickname and datingChapter', async () => {
    fetchMyProfile.mockResolvedValue({
      ...basicProfile,
      nickname: 'ShouldStay',
      datingChapter: 'first_chapter',
      desiredPartnerGenders: ['FEMALE'],
    });
    renderHubForm();

    await waitFor(() => {
      expect(
        (document.getElementById('onb-gender') as HTMLSelectElement).value,
      ).toBe('MALE');
    });

    fireEvent.click(
      screen.getByRole('button', { name: enCopy.onboarding.saveProgress }),
    );

    await waitFor(() => {
      expect(patchMyProfile).toHaveBeenCalled();
    });
    const body = patchMyProfile.mock.calls[0][0] as Record<string, unknown>;
    expect(body).not.toHaveProperty('nickname');
    expect(body).not.toHaveProperty('datingChapter');
    expect(body.onboardingStep).toBe('BASIC');
  });
});
