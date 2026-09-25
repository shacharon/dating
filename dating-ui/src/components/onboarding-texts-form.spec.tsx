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
      expect(
        screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      ).toBeTruthy();
    });
  });

  it('does not render the story voice recorder on the story form', async () => {
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      ).toBeTruthy();
    });
    expect(screen.queryByTestId('story-voice-recorder')).toBeNull();
  });

  it('does not show save or continue buttons on first-time story', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByLabelText(heCopy.onboarding.textsForm.aboutMeLabel),
      ).toBeTruthy();
    });
    expect(
      screen.queryByRole('button', {
        name: heCopy.onboarding.basicForm.continueButton,
      }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: heCopy.onboarding.textsForm.backToBasics }),
    ).toBeNull();
  });

  it('does not show a back link in edit mode', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams('edit=1'));
    renderForm();

    await waitFor(() => {
      expect(
        screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      ).toBeTruthy();
    });
    expect(
      screen.queryByRole('link', { name: enCopy.onboarding.textsForm.backToBasics }),
    ).toBeNull();
  });

  it('saves when leaving a text area and stays on the page', async () => {
    fetchMyProfile.mockResolvedValue({
      ...storyProfile,
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
    });
    renderForm();

    const aboutMe = await screen.findByLabelText(
      enCopy.onboarding.textsForm.aboutMeLabel,
    );
    await waitFor(() => {
      expect((aboutMe as HTMLTextAreaElement).value).toBe('');
    });

    fireEvent.change(aboutMe, { target: { value: 'A short story' } });
    fireEvent.blur(aboutMe);

    await waitFor(() => {
      expect(
        patchMyProfile.mock.calls.length + createMyProfile.mock.calls.length,
      ).toBeGreaterThan(0);
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('creates a profile when leaving a field and none exists', async () => {
    fetchMyProfile.mockResolvedValue(null);
    renderForm();

    const aboutMe = await screen.findByLabelText(
      enCopy.onboarding.textsForm.aboutMeLabel,
    );
    fireEvent.change(aboutMe, { target: { value: 'Hello there' } });
    fireEvent.blur(aboutMe);

    await waitFor(() => {
      expect(createMyProfile).toHaveBeenCalledWith(
        expect.objectContaining({ onboardingStep: 'BASIC' }),
      );
    });
    expect(pushMock).not.toHaveBeenCalled();
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

    fireEvent.change(
      screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
      { target: { value: 'Hello there' } },
    );
    fireEvent.blur(
      screen.getByLabelText(enCopy.onboarding.textsForm.aboutMeLabel),
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
