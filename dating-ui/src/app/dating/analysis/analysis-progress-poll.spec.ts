import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_POLL_INITIAL_MS,
  ANALYSIS_POLL_MAX_MS,
  computeAutoRedirectOnComplete,
  nextPollDelayMs,
  shouldShowWaitingPanel,
  shouldStopPolling,
} from './analysis-progress-poll';

describe('analysis-progress-poll', () => {
  it('nextPollDelayMs backs off and caps at max', () => {
    expect(nextPollDelayMs(ANALYSIS_POLL_INITIAL_MS)).toBe(4500);
    expect(nextPollDelayMs(4500)).toBe(6750);
    expect(nextPollDelayMs(ANALYSIS_POLL_MAX_MS)).toBe(ANALYSIS_POLL_MAX_MS);
  });

  it('shouldShowWaitingPanel is true for SUBMITTED without evaluation', () => {
    expect(
      shouldShowWaitingPanel(
        { status: 'SUBMITTED' } as never,
        null,
      ),
    ).toBe(true);
  });

  it('shouldShowWaitingPanel is true for FAILED even with prior evaluation', () => {
    expect(
      shouldShowWaitingPanel(
        { status: 'FAILED' } as never,
        'eval_1',
      ),
    ).toBe(true);
  });

  it('shouldShowWaitingPanel is false for ANALYZED with evaluation', () => {
    expect(
      shouldShowWaitingPanel(
        { status: 'ANALYZED' } as never,
        'eval_1',
      ),
    ).toBe(false);
  });

  it('computeAutoRedirectOnComplete when first submit in flight', () => {
    expect(
      computeAutoRedirectOnComplete({ status: 'SUBMITTED' } as never, null),
    ).toBe(true);
  });

  it('computeAutoRedirectOnComplete is false when browsing completed results', () => {
    expect(
      computeAutoRedirectOnComplete(
        { status: 'ANALYZED' } as never,
        'eval_1',
      ),
    ).toBe(false);
  });

  it('shouldStopPolling on terminal statuses', () => {
    expect(shouldStopPolling('ANALYZED')).toBe(true);
    expect(shouldStopPolling('ANALYZING')).toBe(false);
  });
});
