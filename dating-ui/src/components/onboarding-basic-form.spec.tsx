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

vi.mock('@/lib/me-photos-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/me-photos-api')>();
  return {
    ...actual,
    listMyProfilePhotos,
  };
});

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ user: { displayName: 'Test User' } }),
}));

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));

import { OnboardingBasicForm } from '@/components/onboarding-basic-form';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';
import type { MeProfileDto } from '@/lib/me-profile-api';

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
    fetchMyProfile.mockResolvedValue(basicProfile);
    patchMyProfile.mockImplementation(async (body) => ({
      ...basicProfile,
      ...body,
    }));
    listMyProfilePhotos.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  it('renders English labels after profile sync', async () => {
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByLabelText(enCopy.onboarding.basicForm.nicknameLabel),
      ).toBeTruthy();
      expect(
        screen.getByRole('heading', { name: enCopy.onboarding.basicForm.sectionTitle }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: enCopy.onboarding.saveProgress }),
      ).toBeTruthy();
    });
  });

  it('renders Hebrew section title and save button when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: heCopy.onboarding.basicForm.sectionTitle }),
      ).toBeTruthy();
      expect(
        screen.getByRole('button', { name: heCopy.onboarding.saveProgress }),
      ).toBeTruthy();
    });
  });

  it('shows localized partner-gender validation when continuing without selections', async () => {
    renderForm();

    await waitFor(() => {
      expect(
        (document.getElementById('onb-gender') as HTMLSelectElement).value,
      ).toBe('MALE');
    });

    fireEvent.click(
      screen.getByRole('button', { name: enCopy.onboarding.basicForm.continueToStory }),
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
    renderForm();

    await waitFor(() => {
      expect(
        (document.getElementById('onb-gender') as HTMLSelectElement).value,
      ).toBe('MALE');
    });

    fireEvent.click(
      screen.getByRole('button', { name: heCopy.onboarding.basicForm.continueToStory }),
    );

    await waitFor(() => {
      expect(patchMyProfile).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain(
        heCopy.onboarding.basicForm.partnerGendersRequiredError,
      );
    });
  });
});
