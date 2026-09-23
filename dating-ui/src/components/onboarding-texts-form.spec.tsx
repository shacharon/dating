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

const pushMock = vi.fn();
const replaceMock = vi.fn();
const searchParamsMock = vi.fn(() => new URLSearchParams());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => searchParamsMock(),
}));

import { OnboardingTextsForm } from '@/components/onboarding-texts-form';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { enCopy } from '@/lib/i18n/en';
import { heCopy } from '@/lib/i18n/he';
import type { MeProfileDto } from '@/lib/api/me-profile-api';

const storyProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'BASIC',
  aboutMe: 'Hello',
  aboutPartner: 'Kind',
  aboutRelationship: 'Long term',
  gender: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function renderForm() {
  return render(
    createElement(
      QueryClientTestProvider,
      { client: createTestQueryClient() },
      createElement(OnboardingTextsForm),
    ),
  );
}

describe('OnboardingTextsForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
    searchParamsMock.mockReturnValue(new URLSearchParams());
    fetchMyProfile.mockResolvedValue(storyProfile);
    patchMyProfile.mockImplementation(async (body) => ({
      ...storyProfile,
      ...body,
    }));
    createMyProfile.mockImplementation(async (body) => ({
      ...storyProfile,
      ...body,
    }));
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(APP_LOCALE_STORAGE_KEY);
  });

  it('renders English intro and field labels after profile sync', async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByText(enCopy.onboarding.textsForm.intro)).toBeTruthy();
      expect(
        screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      ).toBeTruthy();
    });
  });

  it('renders Hebrew continue without back-to-basics on first-time story', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: heCopy.onboarding.basicForm.continueButton,
        }),
      ).toBeTruthy();
    });
    expect(
      screen.queryByRole('link', { name: heCopy.onboarding.textsForm.backToBasics }),
    ).toBeNull();
  });

  it('shows back-to-basics only in edit mode', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams('edit=1'));
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: enCopy.onboarding.textsForm.backToBasics }),
      ).toBeTruthy();
    });
  });

  it('Continue saves and navigates to /onboarding/basic (empty texts OK)', async () => {
    fetchMyProfile.mockResolvedValue({
      ...storyProfile,
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
    });
    renderForm();

    const primary = await screen.findByTestId('onboarding-story-primary');
    await waitFor(() => {
      expect((primary as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(primary);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/onboarding/basic');
    });
    expect(
      patchMyProfile.mock.calls.length + createMyProfile.mock.calls.length,
    ).toBeGreaterThan(0);
  });

  it('Continue creates a profile when none exists', async () => {
    fetchMyProfile.mockResolvedValue(null);
    renderForm();

    const primary = await screen.findByTestId('onboarding-story-primary');
    await waitFor(() => {
      expect((primary as HTMLButtonElement).disabled).toBe(false);
    });

    fireEvent.click(primary);

    await waitFor(() => {
      expect(createMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({ onboardingStep: 'BASIC' }),
      );
      expect(pushMock).toHaveBeenCalledWith('/onboarding/basic');
    });
  });

  it('shows writing help with word count and collapsed examples under each field', async () => {
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      ).toHaveProperty('value', 'Hello');
      expect(screen.getByTestId('ot-about-me-writing-help')).toBeTruthy();
    });

    expect(screen.getByTestId('ot-about-partner-writing-help')).toBeTruthy();
    expect(screen.getByTestId('ot-about-rel-writing-help')).toBeTruthy();

    const wh = enCopy.onboarding.textsForm.writingHelp;
    expect(screen.getAllByText(wh.ideasHeading)).toHaveLength(3);
    expect(screen.queryByTestId('ot-about-me-examples-panel')).toBeNull();

    fireEvent.change(screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel), {
      target: { value: 'one two three' },
    });
    expect(screen.getByTestId('ot-about-me-word-count').textContent).toBe(
      wh.wordCountLine(3),
    );

    fireEvent.click(screen.getByTestId('ot-about-me-examples-toggle'));
    expect(screen.getByTestId('ot-about-me-examples-panel')).toBeTruthy();
    expect(
      screen.getByText(enCopy.onboarding.writingPrompts.aboutMe.examples[0]),
    ).toBeTruthy();
  });

  it('shows localized writing help heading when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderForm();

    await waitFor(() => {
      expect(
        screen.getAllByText(heCopy.onboarding.textsForm.writingHelp.ideasHeading)
          .length,
      ).toBeGreaterThan(0);
    });
  });

  it('shows moderation alert (not only flat string) on save failure', async () => {
    const { ContentModerationApiError } = await import(
      '@/lib/moderation/content-moderation-error'
    );
    patchMyProfile.mockRejectedValue(
      new ContentModerationApiError(
        'content_moderation_failed',
        {
          field: 'aboutPartner',
          category: 'sexual',
          flaggedText: 'wanna fuck',
          reason: 'Direct sexual solicitation',
          suggestion: 'Describe connection or interests.',
          exampleAlternative: 'Looking for someone adventurous',
        },
        'Your profile contains inappropriate content',
      ),
    );

    renderForm();

    await waitFor(() => {
      expect(
        (screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel) as HTMLTextAreaElement)
          .value,
      ).toBe('Hello');
    });

    fireEvent.click(
      screen.getByRole('button', { name: enCopy.onboarding.saveProgress }),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('content-moderation-error-alert'),
      ).toBeTruthy();
    });

    const alert = screen.getByTestId('content-moderation-error-alert');
    expect(alert.textContent).toContain(enCopy.contentModeration.profileTitle);
    expect(alert.textContent).toContain(
      enCopy.onboarding.textsForm.aboutPartnerLabel,
    );
    expect(alert.textContent).toContain('wanna fuck');
    expect(alert.textContent).toContain('Direct sexual solicitation');
    expect(alert.textContent).toContain('Describe connection or interests.');
    expect(alert.textContent).toContain('Looking for someone adventurous');
  });
});
