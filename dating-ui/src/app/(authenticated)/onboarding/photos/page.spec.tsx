/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

vi.mock('@/lib/api/me-photos-api', () => ({
  listMyProfilePhotos: vi.fn().mockResolvedValue([]),
  uploadMyProfilePhoto: vi.fn(),
  deleteMyProfilePhoto: vi.fn(),
  setMyPrimaryProfilePhoto: vi.fn(),
}));

import OnboardingPhotosPage from '@/app/(authenticated)/onboarding/photos/page';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';

describe('OnboardingPhotosPage stub (Story 3)', () => {
  beforeEach(() => {
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  it('shows interim copy and no Finish / Complete profile control', async () => {
    render(
      createElement(
        QueryClientTestProvider,
        { client: createTestQueryClient() },
        createElement(OnboardingPhotosPage),
      ),
    );

    const ff = enCopy.onboarding.factsForm;
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: ff.photosStubTitle })).toBeTruthy();
      expect(screen.getByText(ff.photosStubBody)).toBeTruthy();
    });

    expect(
      screen.queryByRole('button', {
        name: enCopy.onboarding.basicForm.finishButton,
      }),
    ).toBeNull();
    expect(screen.queryByRole('button', { name: /finish/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /complete profile/i })).toBeNull();
  });
});
