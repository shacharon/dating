import { describe, expect, it } from 'vitest';
import {
  isAlreadyRunningSubmitError,
  isAnalysisInFlight,
  runFeedbackAfterStatusCheck,
  RUN_FEEDBACK,
} from './analysis-run-ux';

describe('analysis-run-ux', () => {
  it('isAnalysisInFlight matches SUBMITTED and ANALYZING only', () => {
    expect(isAnalysisInFlight('SUBMITTED')).toBe(true);
    expect(isAnalysisInFlight('ANALYZING')).toBe(true);
    expect(isAnalysisInFlight('ANALYZED')).toBe(false);
    expect(isAnalysisInFlight(undefined)).toBe(false);
  });

  it('isAlreadyRunningSubmitError detects in-flight submit conflicts', () => {
    expect(
      isAlreadyRunningSubmitError(
        'POST failed: 422 invalid_submit_state ANALYZING',
      ),
    ).toBe(true);
    expect(isAlreadyRunningSubmitError('network error')).toBe(false);
  });

  it('uses aligned neutral in-progress copy', () => {
    expect(RUN_FEEDBACK.inProgress).toContain('Analysis in progress');
    expect(RUN_FEEDBACK.stillRunningRefresh).toContain('Refresh this page');
  });

  it('runFeedbackAfterStatusCheck keeps first check silent while still running', () => {
    expect(runFeedbackAfterStatusCheck(1, 'ANALYZING')).toBeUndefined();
    expect(runFeedbackAfterStatusCheck(1, 'SUBMITTED')).toBeUndefined();
  });

  it('runFeedbackAfterStatusCheck nudges refresh on second check while still running', () => {
    expect(runFeedbackAfterStatusCheck(2, 'ANALYZING')).toBe(
      RUN_FEEDBACK.stillRunningRefresh,
    );
  });

  it('runFeedbackAfterStatusCheck clears when analysis finished', () => {
    expect(runFeedbackAfterStatusCheck(1, 'ANALYZED')).toBeNull();
    expect(runFeedbackAfterStatusCheck(2, 'ANALYZED')).toBeNull();
  });
});
