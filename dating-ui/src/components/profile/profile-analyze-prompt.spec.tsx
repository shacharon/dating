/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import type { MeLatestAnalysisDto } from '@/lib/api/me-analysis-api';
import type { MeProfileDto } from '@/lib/api-types/profile';
import { enCopy } from '@/lib/i18n/en';
import { ProfileAnalyzePrompt } from './profile-analyze-prompt';

const { mutateAsync } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
}));

vi.mock('@/hooks/use-profile', () => ({
  useSubmitProfileForAnalysis: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

const hub = enCopy.profile.hub;

function emptyDraft(): ProfileDraft {
  return {
    nickname: '',
    aboutMe: '',
    aboutPartner: '',
    aboutRelationship: '',
    birthDate: '',
    gender: '',
    desiredPartnerGenders: [],
    city: '',
    country: '',
    locationLabel: '',
  };
}

function storyDraft(length: number): ProfileDraft {
  return {
    ...emptyDraft(),
    aboutMe: 'a'.repeat(length),
  };
}

function factsProfile(
  overrides: Partial<MeProfileDto> = {},
): MeProfileDto {
  return {
    id: 'p1',
    userId: 'u1',
    status: 'ACTIVE',
    onboardingStep: 'COMPLETED',
    aboutMe: null,
    aboutPartner: null,
    aboutRelationship: null,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    gender: 'FEMALE',
    desiredPartnerGenders: ['MALE'],
    city: 'Tel Aviv',
    birthDate: '1990-01-01',
    ...overrides,
  };
}

function renderPrompt({
  profile = null,
  draft = emptyDraft(),
  analysis = null,
  onFinished = vi.fn(),
}: {
  profile?: MeProfileDto | null;
  draft?: ProfileDraft;
  analysis?: MeLatestAnalysisDto | null;
  onFinished?: () => void;
} = {}) {
  return render(
    <ProfileAnalyzePrompt
      profile={profile}
      draft={draft}
      analysis={analysis}
      onFinished={onFinished}
    />,
  );
}

function expectNotReady() {
  expect(screen.getByText(hub.analyzeNeedTitle)).toBeTruthy();
  expect(screen.queryByTestId('profile-analyze-button')).toBeNull();
}

describe('ProfileAnalyzePrompt', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the explanation and no button for an empty profile', () => {
    renderPrompt();
    expectNotReady();
  });

  it('stays not ready when the story is 39 characters and the facts are saved', () => {
    renderPrompt({
      profile: factsProfile(),
      draft: storyDraft(39),
    });
    expectNotReady();
  });

  it('stays not ready when gender is prefer not to say', () => {
    renderPrompt({
      profile: factsProfile({ gender: 'PREFER_NOT_TO_SAY' }),
      draft: storyDraft(40),
    });
    expectNotReady();
  });

  it('shows Analyze your profile when the story and four facts are saved', () => {
    renderPrompt({
      profile: factsProfile(),
      draft: storyDraft(40),
    });

    const buttons = screen.getAllByRole('button', { name: hub.analyzeButton });
    expect(buttons).toHaveLength(1);
    expect(screen.getByTestId('profile-analyze-button')).toBe(buttons[0]);
  });

  it('shows up to three highlights and hides the button when a result exists', () => {
    renderPrompt({
      profile: factsProfile(),
      draft: storyDraft(40),
      analysis: {
        userProfileId: 'p1',
        evaluationId: 'ev-1',
        createdAt: '2020-01-02T00:00:00.000Z',
        evaluationJson: {
          display: { aboutMeInsight: 'Line one' },
          chips: {
            self: [
              { label: 'Line two' },
              { label: 'Line three' },
              { label: 'Line four' },
            ],
          },
        },
      },
    });

    expect(screen.getByText('Line one')).toBeTruthy();
    expect(screen.getByText('Line two')).toBeTruthy();
    expect(screen.getByText('Line three')).toBeTruthy();
    expect(screen.queryByText('Line four')).toBeNull();
    expect(screen.queryByTestId('profile-analyze-button')).toBeNull();
  });

  it('submits the existing analysis job from the ready button', async () => {
    renderPrompt({
      profile: factsProfile(),
      draft: storyDraft(40),
    });

    fireEvent.click(screen.getByTestId('profile-analyze-button'));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the button and shows the failure when submit rejects', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('submit failed'));

    renderPrompt({
      profile: factsProfile(),
      draft: storyDraft(40),
    });

    fireEvent.click(screen.getByTestId('profile-analyze-button'));

    expect((await screen.findByRole('alert')).textContent).toBe(hub.analyzeFailed);
    expect(screen.getByTestId('profile-analyze-button')).toBeTruthy();
  });
});
