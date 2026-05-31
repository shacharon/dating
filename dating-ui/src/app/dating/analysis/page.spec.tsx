/** @vitest-environment jsdom */
import { act, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANALYSIS_STATUS_CHECK_FIRST_MS,
  ANALYSIS_STATUS_CHECK_SECOND_MS,
  RUN_FEEDBACK,
} from './analysis-run-ux';
import DatingAnalysisPage from './page';

const mocked = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  fetchMyLatestAnalysisMock: vi.fn(),
  fetchMyProfileMock: vi.fn(),
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
    /re-run analysis|analysis running|starting/i.test(b.textContent ?? ''),
  );
  if (!btn) throw new Error('Re-run button not found');
  return btn;
}

describe('DatingAnalysisPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    mocked.replaceMock.mockReset();
    mocked.fetchMyLatestAnalysisMock.mockReset();
    mocked.fetchMyProfileMock.mockReset();
    mocked.submitMyProfileForAnalysisMock.mockReset();
  });

  it('renders summary and separated cards', async () => {
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

    root.unmount();
    div.remove();
  });

  it('disables re-run on initial load when profile status is ANALYZING', async () => {
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

    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    await act(async () => {
      root.render(createElement(DatingAnalysisPage));
    });
    await flush();

    const btn = findReRunButton(div);
    expect(btn.textContent).toContain('Analysis running');
    expect(btn.disabled).toBe(true);
    expect(div.textContent).toContain(RUN_FEEDBACK.inProgress);
    expect(div.textContent).not.toContain('Could not start analysis');

    root.unmount();
    div.remove();
  });

  it('disables re-run immediately on click and submits once', async () => {
    mockAnalyzedPageLoad();
    mocked.submitMyProfileForAnalysisMock.mockResolvedValue({
      ...analyzedProfile,
      status: 'SUBMITTED',
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
    expect(div.textContent).toContain(RUN_FEEDBACK.inProgress);

    await act(async () => {
      btnAfterClick.click();
    });
    await flush();
    expect(mocked.submitMyProfileForAnalysisMock).toHaveBeenCalledTimes(1);

    root.unmount();
    div.remove();
  });

  it('after first status check completes, refreshes analysis and re-enables re-run', async () => {
    mockAnalyzedPageLoad();
    mocked.submitMyProfileForAnalysisMock.mockResolvedValue({
      ...analyzedProfile,
      status: 'SUBMITTED',
    });

    const div = document.createElement('div');
    document.body.appendChild(div);
    const root = createRoot(div);

    await act(async () => {
      root.render(createElement(DatingAnalysisPage));
    });
    await flush();

    findReRunButton(div).click();
    await flush();

    mocked.fetchMyLatestAnalysisMock.mockResolvedValue({
      ...analyzedLatest,
      evaluationId: 'eval_new',
      createdAt: '2026-05-02T17:00:00.000Z',
      evaluationJson: {
        display: {
          overallNarrative: 'Updated narrative after re-run.',
          aboutMeInsight: 'Updated about you.',
          relationshipInsight: 'Updated relate.',
          partnerInsight: 'Updated partner.',
        },
        flags: [],
      },
    });
    mocked.fetchMyProfileMock.mockResolvedValue({
      ...analyzedProfile,
      status: 'ANALYZED',
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_STATUS_CHECK_FIRST_MS);
    });
    await flush();

    expect(div.textContent).toContain('Updated narrative after re-run.');
    const btn = findReRunButton(div);
    expect(btn.disabled).toBe(false);
    expect(div.textContent).not.toContain(RUN_FEEDBACK.stillRunningRefresh);

    root.unmount();
    div.remove();
  });

  it('after second status check while still running keeps button disabled with neutral refresh message', async () => {
    mockAnalyzedPageLoad();
    mocked.submitMyProfileForAnalysisMock.mockResolvedValue({
      ...analyzedProfile,
      status: 'SUBMITTED',
    });

    render(createElement(DatingAnalysisPage));
    await screen.findByText(/warm, thoughtful/);

    mocked.fetchMyProfileMock.mockResolvedValue({
      ...analyzedProfile,
      status: 'ANALYZING',
    });

    await act(async () => {
      findReRunButton(document.body).click();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANALYSIS_STATUS_CHECK_FIRST_MS);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(
        ANALYSIS_STATUS_CHECK_SECOND_MS - ANALYSIS_STATUS_CHECK_FIRST_MS,
      );
    });
    await flush();

    expect(screen.getByTestId('analysis-run-feedback').textContent).toBe(
      RUN_FEEDBACK.stillRunningRefresh,
    );

    const btn = findReRunButton(document.body);
    expect(btn.disabled).toBe(true);
    expect(screen.queryByText('Could not start analysis')).toBeNull();
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
});
