/** @vitest-environment jsdom */
import { act } from 'react';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
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

async function flush(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

describe('DatingAnalysisPage', () => {
  afterEach(() => {
    mocked.replaceMock.mockReset();
    mocked.fetchMyLatestAnalysisMock.mockReset();
    mocked.fetchMyProfileMock.mockReset();
    mocked.submitMyProfileForAnalysisMock.mockReset();
  });

  it('renders summary and separated cards', async () => {
    mocked.fetchMyLatestAnalysisMock.mockResolvedValue({
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
          partnerInsight:
            'You are drawn to kind, reliable people with depth.',
        },
        flags: ['LOW_COVERAGE'],
      },
    });
    mocked.fetchMyProfileMock.mockResolvedValue({
      id: 'prof_1',
      userId: 'user_1',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      aboutMe: 'I enjoy quiet mornings and long walks.',
      aboutPartner: 'I value kindness and consistency.',
      aboutRelationship: 'I want a calm, committed relationship.',
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

    const text = div.textContent ?? '';
    expect(text).toContain(
      'You come across as warm, thoughtful, and clear about connection.',
    );
    expect(text).toContain('About you');
    expect(text).toContain('How you relate');
    expect(text).toContain('Who you want');
    expect(text).toContain('About me');
    expect(text).toContain('Relationship style');
    expect(text).toContain('Partner preference');
    expect(text).toContain('What you wrote');
    expect(text).toContain('You seem grounded and emotionally present.');
    expect(text).toContain(
      'You value steady communication and emotional honesty.',
    );
    expect(text).toContain(
      'You are drawn to kind, reliable people with depth.',
    );

    root.unmount();
    div.remove();
  });

  it('disables re-run while profile status is ANALYZING', async () => {
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

    const btn = div.querySelector('button[type="button"]') as HTMLButtonElement | null;
    expect(btn?.textContent).toContain('Analysis running');
    expect(btn?.disabled).toBe(true);
    expect(div.textContent).toContain('being analyzed');

    root.unmount();
    div.remove();
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
          missingPrompts: ['What helps you feel closest to someone?', 'How do you usually repair after tension?'],
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
    expect(text).not.toContain('limited information provided');
    expect(text).not.toContain('score confidence is lower');

    root.unmount();
    div.remove();
  });
});
