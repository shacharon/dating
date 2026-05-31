/** Shared copy + timing for analysis re-run UX (no continuous polling). */

export function isAnalysisInFlight(profileStatus: string | undefined): boolean {
  return profileStatus === 'SUBMITTED' || profileStatus === 'ANALYZING';
}

/** First scheduled status check after a run starts (ms). */
export const ANALYSIS_STATUS_CHECK_FIRST_MS = 45_000;

/** Second status check for slower runs (ms). */
export const ANALYSIS_STATUS_CHECK_SECOND_MS = 90_000;

export const RUN_FEEDBACK = {
  inProgress: 'Analysis in progress. This usually takes about a minute.',
  stillRunningRefresh:
    'Analysis is still running. Refresh this page in a moment.',
  submitFailed: 'Could not start analysis. Try again.',
} as const;

export function isAlreadyRunningSubmitError(message: string): boolean {
  return (
    message.includes('invalid_submit_state') ||
    message.includes('ANALYZING') ||
    message.includes('SUBMITTED')
  );
}

/** Feedback after a scheduled status check (null = clear / no change). */
export function runFeedbackAfterStatusCheck(
  checkIndex: 1 | 2,
  profileStatus: string | undefined,
): string | null | undefined {
  if (!isAnalysisInFlight(profileStatus)) {
    return null;
  }
  if (checkIndex === 2) {
    return RUN_FEEDBACK.stillRunningRefresh;
  }
  return undefined;
}
