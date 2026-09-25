/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

const { fetchMyProfile, patchMyProfile, submitMyProfileForAnalysis } = vi.hoisted(
  () => ({
    fetchMyProfile: vi.fn(),
    patchMyProfile: vi.fn(),
    submitMyProfileForAnalysis: vi.fn(),
  }),
);

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    profile: {
      fetchMyProfile,
      patchMyProfile,
      createMyProfile: vi.fn(),
      submitMyProfileForAnalysis,
    },
  },
}));

const { listMyProfilePhotos } = vi.hoisted(() => ({
  listMyProfilePhotos: vi.fn(),
}));

vi.mock('@/lib/api/me-photos-api', () => ({
  listMyProfilePhotos,
  uploadMyProfilePhoto: vi.fn(),
  deleteMyProfilePhoto: vi.fn(),
  setMyPrimaryProfilePhoto: vi.fn(),
  setPrimaryMyProfilePhoto: vi.fn(),
  fetchMyProfilePhotoBlob: vi.fn().mockResolvedValue(new Blob()),
}));

const pushMock = vi.fn();
const replaceMock = vi.fn();
const searchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsMock(),
}));

import OnboardingPhotosPage from '@/app/(authenticated)/onboarding/photos/page';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import type { MeProfileDto } from '@/lib/api/me-profile-api';

const textsProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'TEXTS',
  aboutMe: null,
  aboutPartner: null,
  aboutRelationship: null,
  gender: 'MALE',
  desiredPartnerGenders: ['FEMALE'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function renderPage() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(OnboardingPhotosPage),
    ),
  );
}

describe('OnboardingPhotosPage (Story 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
    searchParamsMock.mockReturnValue(new URLSearchParams());
    fetchMyProfile.mockResolvedValue(textsProfile);
    patchMyProfile.mockImplementation(async (body) => ({
      ...textsProfile,
      ...body,
    }));
    listMyProfilePhotos.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  it('keeps Finish disabled until a photo exists', async () => {
    renderPage();
    const pf = enCopy.onboarding.photosForm;

    await waitFor(() => {
      expect(screen.getByText(pf.finishHint)).toBeTruthy();
    });

    const finish = screen.getByTestId(
      'onboarding-photos-finish',
    ) as HTMLButtonElement;
    expect(finish.disabled).toBe(true);
    expect(finish.getAttribute('aria-describedby')).toContain(
      'onboarding-photos-finish-status',
    );
  });

  it('Finish opens Preferences and does not mark onboarding complete', async () => {
    listMyProfilePhotos.mockResolvedValue([
      {
        id: 'ph1',
        status: 'PENDING',
        position: 0,
        isPrimary: true,
      },
    ]);

    renderPage();
    const pf = enCopy.onboarding.photosForm;

    await waitFor(() => {
      expect(
        (screen.getByTestId('onboarding-photos-finish') as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    });

    fireEvent.click(screen.getByTestId('onboarding-photos-finish'));

    await waitFor(() => {
      expect(patchMyProfile).not.toHaveBeenCalled();
      expect(submitMyProfileForAnalysis).not.toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/onboarding/preferences');
    });

    expect(screen.getByText(pf.pendingNote)).toBeTruthy();
  });

  it('enables Finish when the only photo is REJECTED', async () => {
    listMyProfilePhotos.mockResolvedValue([
      {
        id: 'ph1',
        status: 'REJECTED',
        position: 0,
        isPrimary: true,
      },
    ]);

    renderPage();

    await waitFor(() => {
      expect(
        (screen.getByTestId('onboarding-photos-finish') as HTMLButtonElement)
          .disabled,
      ).toBe(false);
    });
  });

  it('redirects already-COMPLETED users to matches', async () => {
    fetchMyProfile.mockResolvedValue({
      ...textsProfile,
      onboardingStep: 'COMPLETED',
    });

    renderPage();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/dating/me-matches');
    });
  });
});
