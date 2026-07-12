/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const {
  fetchMyProfile,
  patchMyProfile,
  submitMyProfileForAnalysis,
} = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  patchMyProfile: vi.fn(),
  submitMyProfileForAnalysis: vi.fn(),
}));

vi.mock('@/lib/me-profile-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/me-profile-api')>();
  return {
    ...actual,
    fetchMyProfile,
    patchMyProfile,
    submitMyProfileForAnalysis,
  };
});

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
}));

import { OnboardingTextsForm } from '@/components/onboarding-texts-form';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';
import type { MeProfileDto } from '@/lib/me-profile-api';

const textsProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'TEXTS',
  aboutMe: 'Hello',
  aboutPartner: 'Kind',
  aboutRelationship: 'Long term',
  gender: 'MALE',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

describe('OnboardingTextsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
    fetchMyProfile.mockResolvedValue(textsProfile);
    patchMyProfile.mockImplementation(async (body) => ({
      ...textsProfile,
      ...body,
    }));
    submitMyProfileForAnalysis.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  it('renders English intro and field labels after profile sync', async () => {
    render(<OnboardingTextsForm />);

    await waitFor(() => {
      expect(screen.getByText(enCopy.onboarding.textsForm.intro)).toBeTruthy();
      expect(
        screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      ).toBeTruthy();
    });
  });

  it('renders Hebrew finish and back links when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    render(<OnboardingTextsForm />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: heCopy.onboarding.textsForm.finishAndAnalyze }),
      ).toBeTruthy();
      expect(
        screen.getByRole('link', { name: heCopy.onboarding.textsForm.backToBasics }),
      ).toBeTruthy();
    });
  });

  it('shows localized gender-missing error when finish is blocked', async () => {
    let fetchCount = 0;
    fetchMyProfile.mockImplementation(async () => {
      fetchCount += 1;
      if (fetchCount === 1) return textsProfile;
      return { ...textsProfile, gender: 'PREFER_NOT_TO_SAY' };
    });

    render(<OnboardingTextsForm />);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: enCopy.onboarding.textsForm.finishAndAnalyze }),
      ).toBeTruthy();
    });

    fireEvent.click(
      screen.getByRole('button', { name: enCopy.onboarding.textsForm.finishAndAnalyze }),
    );

    await waitFor(() => {
      expect(submitMyProfileForAnalysis).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain(
        enCopy.onboarding.textsForm.genderMissingError,
      );
    });
  });
});
