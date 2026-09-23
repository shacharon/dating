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

function renderForm() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(OnboardingBasicForm),
    ),
  );
}

describe('OnboardingBasicForm', () => {
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

  it('renders Basic tab content by default (story is its own route)', async () => {
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: enCopy.onboarding.basicForm.basicTabTitle }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: enCopy.onboarding.saveProgress }),
      ).toBeTruthy();
      expect(
        screen.queryByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      ).toBeNull();
    });
  });

  it('renders Hebrew basic tab title when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: heCopy.onboarding.basicForm.basicTabTitle }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: heCopy.onboarding.saveProgress }),
      ).toBeTruthy();
    });
  });

  it('shows localized partner-gender validation when continuing from Basic without selections', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams('tab=basic'));
    renderForm();

    await waitFor(() => {
      expect(
        (document.getElementById('onb-gender') as HTMLSelectElement).value,
      ).toBe('MALE');
    });

    fireEvent.click(
      screen.getByRole('button', { name: enCopy.onboarding.basicForm.continueButton }),
    );

    await waitFor(() => {
      expect(patchMyProfile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain(
        enCopy.onboarding.basicForm.partnerGendersRequiredError,
      );
    });
  });

  it('shows Hebrew partner-gender validation when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    searchParamsMock.mockReturnValue(new URLSearchParams('tab=basic'));
    renderForm();

    await waitFor(() => {
      expect(
        (document.getElementById('onb-gender') as HTMLSelectElement).value,
      ).toBe('MALE');
    });

    fireEvent.click(
      screen.getByRole('button', { name: heCopy.onboarding.basicForm.continueButton }),
    );

    await waitFor(() => {
      expect(patchMyProfile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain(
        heCopy.onboarding.basicForm.partnerGendersRequiredError,
      );
    });
  });

  describe('URL tab content', () => {
    it('shows basic fields when tab=basic', async () => {
      searchParamsMock.mockReturnValue(new URLSearchParams('tab=basic'));
      renderForm();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: enCopy.onboarding.basicForm.basicTabTitle }),
        ).toBeTruthy();
        expect(screen.getByLabelText(enCopy.onboarding.basicForm.genderLabel)).toBeTruthy();
      });
    });

    it('shows other fields and dating journey when tab=other', async () => {
      searchParamsMock.mockReturnValue(new URLSearchParams('tab=other'));
      renderForm();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: enCopy.onboarding.basicForm.otherTabTitle }),
        ).toBeTruthy();
        expect(
          screen.getByLabelText(enCopy.onboarding.basicForm.nicknameLabel),
        ).toBeTruthy();
        expect(
          screen.getByText(enCopy.onboarding.basicForm.datingChapter.question),
        ).toBeTruthy();
        expect(
          screen.getByText(enCopy.onboarding.basicForm.finishButton),
        ).toBeTruthy();
      });
    });

    it('fetches filtered countries for onboarding variant', async () => {
      renderForm();

      await waitFor(() => {
        expect(listPlaceCountries).toHaveBeenCalledWith('onboarding');
      });
    });

    it('does not show page-local Skip (header owns Skip)', async () => {
      renderForm();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: enCopy.onboarding.basicForm.basicTabTitle }),
        ).toBeTruthy();
      });
      expect(screen.queryByText(enCopy.onboarding.basicForm.skipButton)).toBeNull();
    });

    it('does not render story textareas on the basic page', async () => {
      renderForm();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: enCopy.onboarding.basicForm.basicTabTitle }),
        ).toBeTruthy();
      });
      expect(
        screen.queryByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      ).toBeNull();
      expect(
        screen.queryByLabelText(enCopy.onboarding.textsForm.aboutPartnerLabel),
      ).toBeNull();
    });
  });
});
