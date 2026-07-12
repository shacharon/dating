/** @vitest-environment jsdom */
import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { APP_LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { heCopy } from '@/lib/i18n/he';
import { ANALYSIS_POLL_INITIAL_MS } from './analysis-progress-poll';
import DatingAnalysisPage from './page';

const mocked = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  fetchMyLatestAnalysisMock: vi.fn(),
  fetchMyProfileMock: vi.fn(),
  fetchAnalysisStatusMock: vi.fn(),
  submitMyProfileForAnalysisMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocked.replaceMock }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => createElement('a', { href, ...props }, children),
}));

vi.mock('@/lib/me-profile-api', () => ({
  fetchMyLatestAnalysis: mocked.fetchMyLatestAnalysisMock,
  fetchMyProfile: mocked.fetchMyProfileMock,
  fetchAnalysisStatus: mocked.fetchAnalysisStatusMock,
  submitMyProfileForAnalysis: mocked.submitMyProfileForAnalysisMock,
}));

async function flush(times = 8): Promise<void> {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise<void>((resolve) => queueMicrotask(resolve));
    });
  }
}

const analyzedLatest = {
  userProfileId: 'prof_1',
  evaluationId: 'eval_1',
  createdAt: '2026-05-02T16:00:00.000Z',
  evaluationJson: {
    display: {
      overallNarrative:
        'You come across as warm, thoughtful, and clear about connection.',
      aboutMeInsight: 'You seem grounded and emotionally present.',
      relationshipInsight:
        'You value steady communication and emotional honesty.',
      partnerInsight: 'You are drawn to kind, reliable people with depth.',
    },
    flags: ['LOW_COVERAGE'],
  },
};

const analyzedProfile = {
  id: 'prof_1',
  userId: 'user_1',
  status: 'ANALYZED',
  onboardingStep: 'COMPLETED',
  aboutMe: 'I enjoy quiet mornings and long walks.',
  aboutPartner: 'I value kindness and consistency.',
  aboutRelationship: 'I want a calm, committed relationship.',
  createdAt: '2026-05-01T00:00:00.000Z',
  updatedAt: '2026-05-02T00:00:00.000Z',
};

function mockAnalyzedPageLoad() {
  mocked.fetchMyLatestAnalysisMock.mockResolvedValue(analyzedLatest);
  mocked.fetchMyProfileMock.mockResolvedValue(analyzedProfile);
}

function findReRunButton(container: HTMLElement): HTMLButtonElement {
  const buttons = Array.from(
    container.querySelectorAll('button[type="button"]'),
  ) as HTMLButtonElement[];
  const btn = buttons.find((b) =>
    /re-run analysis|analysis running/i.test(b.textContent ?? ''),
  );
  if (!btn) throw new Error('Re-run button not found');
  return btn;
}

describe('DatingAnalysisPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    mocked.replaceMock.mockReset();
    mocked.fetchMyLatestAnalysisMock.mockReset();
    mocked.fetchMyProfileMock.mockReset();
    mocked.fetchAnalysisStatusMock.mockReset();
    mocked.submitMyProfileForAnalysisMock.mockReset();
  });

  it('renders summary and separated cards when already analyzed', async () => {
    mockAnalyzedPageLoad();

    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    await act(async () => {
      root.render(createElement(DatingAnalysisPage));
    });
    await flush();

    const text = div.textContent ?? '';
    expect(text).toContain(
      'You come across as warm, thoughtful, and clear about connection.',
    );
    expect(text).toContain('About you');
    expect(text).toContain('How you relate');
    expect(text).toContain('Who you want');
    expect(screen.queryByTestId('analysis-progress-panel')).toBeNull();

    root.unmount();
    div.remove();
  });

  it('shows waiting panel when profile status is ANALYZING on mount', async () => {
    mocked.fetchMyLatestAnalysisMock.mockResolvedValue({
      userProfileId: 'prof_3',
      evaluationId: 'eval_3',
      createdAt: '2026-05-02T16:00:00.000Z',
      evaluationJson: {
        display: {
          overallNarrative: 'Warm and intentional.',
          aboutMeInsight: 'Grounded.',
          relationshipInsight: 'Steady.',
          partnerInsight: 'Kind.',
        },
        flags: [],
      },
    });
    mocked.fetchMyProfileMock.mockResolvedValue({
      id: 'prof_3',
      userId: 'user_3',
      status: 'ANALYZING',
      onboardingStep: 'COMPLETED',
      aboutMe: 'A',
      aboutPartner: 'B',
      aboutRelationship: 'C',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    });

    render(createElement(DatingAnalysisPage));
    await flush();

    expect(screen.getByTestId('analysis-progress-panel')).toBeTruthy();
    expect(screen.getByTestId('analysis-step-analyzing')).toBeTruthy();
    expect(screen.queryByTestId('analysis-rerun-button')).toBeNull();
  });

  it('redirects to matches when poll observes ANALYZED during wait session', async () => {
    mocked.fetchMyLatestAnalysisMock.mockResolvedValue({
      userProfileId: 'prof_wait',
      evaluationId: null,
      createdAt: '2026-05-02T16:00:00.000Z',
      evaluationJson: null,
    });
    mocked.fetchMyProfileMock.mockResolvedValue({
      id: 'prof_wait',
      userId: 'user_wait',
      status: 'SUBMITTED',
      onboardingStep: 'COMPLETED',
      aboutMe: 'A',
      aboutPartner: 'B',
      aboutRelationship: 'C',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    });

    render(createElement(DatingAnalysisPage));
    await flush();

    expect(screen.getByTestId('analysis-progress-panel')).toBeTruthy();

    mocked.fetchMyProfileMock.mockResolvedValue({
      id: 'prof_wait',
      userId: 'user_wait',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      aboutMe: 'A',
      aboutPartner: 'B',
      aboutRelationship: 'C',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    });
    mocked.fetchMyLatestAnalysisMock.mockResolvedValue(analyzedLatest);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_POLL_INITIAL_MS);
    });
    await flush();

    expect(mocked.replaceMock).toHaveBeenCalledWith('/dating/me-matches');
  });

  it('does not redirect when user opens page with ANALYZED results on mount', async () => {
    mockAnalyzedPageLoad();

    render(createElement(DatingAnalysisPage));
    await flush();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_POLL_INITIAL_MS * 2);
    });
    await flush();

    expect(mocked.replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('analysis-rerun-button')).toBeTruthy();
  });

  it('disables re-run immediately on click and submits once', async () => {
    mockAnalyzedPageLoad();
    mocked.submitMyProfileForAnalysisMock.mockResolvedValue({
      analysisJobId: 'job_test',
      profile: {
        ...analyzedProfile,
        status: 'SUBMITTED',
      },
    });

    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    await act(async () => {
      root.render(createElement(DatingAnalysisPage));
    });
    await flush();

    const btn = findReRunButton(div);
    await act(async () => {
      btn.click();
    });
    await flush();

    expect(mocked.submitMyProfileForAnalysisMock).toHaveBeenCalledTimes(1);
    const btnAfterClick = findReRunButton(div);
    expect(btnAfterClick.disabled).toBe(true);
    expect(btnAfterClick.textContent).toMatch(/analysis running/i);

    await act(async () => {
      btnAfterClick.click();
    });
    await flush();
    expect(mocked.submitMyProfileForAnalysisMock).toHaveBeenCalledTimes(1);

    root.unmount();
    div.remove();
  });

  it('shows failed panel with retry when status is FAILED after re-run', async () => {
    mocked.fetchMyLatestAnalysisMock.mockResolvedValue(analyzedLatest);
    mocked.fetchMyProfileMock.mockResolvedValue({
      ...analyzedProfile,
      status: 'FAILED',
    });

    render(createElement(DatingAnalysisPage));
    await flush();

    expect(screen.getByTestId('analysis-progress-panel')).toBeTruthy();
    expect(screen.getByTestId('analysis-progress-retry')).toBeTruthy();
    expect(screen.queryByTestId('analysis-rerun-button')).toBeNull();
  });

  it('does not render raw clinical legacy summary text', async () => {
    mocked.fetchMyLatestAnalysisMock.mockResolvedValue({
      userProfileId: 'prof_2',
      evaluationId: 'eval_2',
      createdAt: '2026-05-02T16:10:00.000Z',
      evaluationJson: {
        display: {
          overallNarrative:
            'You show intention and warmth, and your profile already gives a clear direction.',
          summary:
            'Based on limited information provided, we cannot ascertain the individual profile.',
          aboutMeInsight:
            'You seem thoughtful and open to meaningful connection.',
          relationshipInsight:
            'You value calm, direct communication in relationships.',
          partnerInsight:
            'You are looking for steadiness, warmth, and emotional maturity.',
          missingPrompts: ['What helps you feel closest to someone?'],
        },
        flags: [],
      },
    });
    mocked.fetchMyProfileMock.mockResolvedValue({
      id: 'prof_2',
      userId: 'user_2',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      aboutMe: 'Thoughtful and communicative.',
      aboutPartner: 'Reliable and warm.',
      aboutRelationship: 'Steady and honest.',
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-02T00:00:00.000Z',
    });

    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    await act(async () => {
      root.render(createElement(DatingAnalysisPage));
    });
    await flush();

    const text = (div.textContent ?? '').toLowerCase();
    expect(text).toContain('you show intention and warmth');
    expect(text).not.toContain('individual');
    expect(text).not.toContain('ascertain');

    root.unmount();
    div.remove();
  });

  it('renders Hebrew section headings when locale is he', async () => {
    localStorage.setItem(APP_LOCALE_STORAGE_KEY, 'he');
    mockAnalyzedPageLoad();

    render(createElement(DatingAnalysisPage));
    await flush();

    expect(screen.getByText(heCopy.analysisPage.sectionHowWeRead)).toBeTruthy();
    expect(screen.getByText(heCopy.analysisPage.sectionWhatYouWrote)).toBeTruthy();
    expect(
      screen.getByText(
        'You come across as warm, thoughtful, and clear about connection.',
      ),
    ).toBeTruthy();

    localStorage.clear();
  });
});
