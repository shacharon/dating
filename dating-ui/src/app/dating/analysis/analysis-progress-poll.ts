import type { MeProfileDto } from '@/lib/me-profile-api';
import { isAnalysisInFlight } from './analysis-run-ux';

export const ANALYSIS_POLL_INITIAL_MS = 3_000;
export const ANALYSIS_POLL_MAX_MS = 10_000;
export const ANALYSIS_POLL_BACKOFF = 1.5;
export const ANALYSIS_POLL_MAX_DURATION_MS = 600_000;

export function nextPollDelayMs(priorDelayMs: number): number {
  return Math.min(
    Math.round(priorDelayMs * ANALYSIS_POLL_BACKOFF),
    ANALYSIS_POLL_MAX_MS,
  );
}

export function shouldShowWaitingPanel(
  profile: MeProfileDto | null | undefined,
  evaluationId: string | null | undefined,
): boolean {
  if (!profile) return false;
  if (isAnalysisInFlight(profile.status)) return true;
  if (profile.status === 'FAILED') return true;
  if (
    !evaluationId &&
    profile.status !== 'ANALYZED' &&
    profile.status !== 'DRAFT'
  ) {
    return true;
  }
  return false;
}

export function computeAutoRedirectOnComplete(
  profile: MeProfileDto | null | undefined,
  evaluationId: string | null | undefined,
): boolean {
  const startedInFlight = isAnalysisInFlight(profile?.status);
  const startedAwaitingFirstResult =
    !evaluationId &&
    profile?.status !== 'ANALYZED' &&
    profile?.status !== 'DRAFT';
  return startedInFlight || startedAwaitingFirstResult;
}

export function shouldStopPolling(profileStatus: string | undefined): boolean {
  return (
    profileStatus === 'ANALYZED' ||
    profileStatus === 'FAILED' ||
    profileStatus === 'DRAFT'
  );
}
