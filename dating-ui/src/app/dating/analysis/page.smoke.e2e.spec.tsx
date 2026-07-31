/** @vitest-environment jsdom */
import { act } from 'react';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import DatingAnalysisPage from './analysis-page-client';

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

describe('Analyze page smoke', () => {
  it('shows friendly narrative + separated cards, and hides clinical phrases', async () => {
    // Simulates an authenticated analyzed user response from /api/v1/me/profile/analysis/latest.
    mocked.fetchMyLatestAnalysisMock.mockResolvedValue({
      userProfileId: 'prof_smoke_1',
      evaluationId: 'eval_smoke_1',
      createdAt: '2026-05-02T16:00:00.000Z',
      evaluationJson: {
        display: {
          overallNarrative:
            'You come across as warm, intentional, and clear about meaningful connection.',
          summary:
            'Based on limited information provided, we cannot ascertain the individual profile.',
          aboutMeInsight: 'You seem grounded and emotionally present.',
          relationshipInsight:
            'You value steady, direct communication and emotional clarity.',
          partnerInsight:
            'You are drawn to kind, reliable people with depth and consistency.',
        },
        flags: ['LOW_COVERAGE'],
      },
    });
    mocked.fetchMyProfileMock.mockResolvedValue({
      id: 'prof_smoke_1',
      userId: 'user_smoke_1',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      aboutMe: 'I enjoy depth and consistency.',
      aboutPartner: 'I appreciate warmth and accountability.',
      aboutRelationship: 'I prefer direct communication and calm repair.',
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
    expect(text).toContain('you come across as warm, intentional');
    expect(text).toContain('about you');
    expect(text).toContain('how you relate');
    expect(text).toContain('who you want');
    expect(text).toContain('about me');
    expect(text).toContain('relationship style');
    expect(text).toContain('partner preference');
    expect(text).toContain('what you wrote');
    expect(text).not.toContain('individual');
    expect(text).not.toContain('ascertain');
    expect(text).not.toContain('limited information provided');
    expect(text).not.toContain('score confidence is lower');

    root.unmount();
    div.remove();
  });
});
