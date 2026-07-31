'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchAnalysisStatus,
  fetchMyLatestAnalysis,
  type MeLatestAnalysisDto,
} from '@/lib/me-analysis-api';
import {
  fetchMyProfile,
  submitMyProfileForAnalysis,
  type MeProfileDto,
} from '@/lib/me-profile-api';
import {
  ANALYSIS_POLL_INITIAL_MS,
  ANALYSIS_POLL_MAX_DURATION_MS,
  computeAutoRedirectOnComplete,
  nextPollDelayMs,
  shouldShowWaitingPanel,
  shouldStopPolling,
} from './analysis-progress-poll';
import {
  isAlreadyRunningSubmitError,
  isAnalysisInFlight,
} from './analysis-run-ux';

async function loadAnalysisPageState(): Promise<{
  latest: MeLatestAnalysisDto | null;
  profile: MeProfileDto | null;
}> {
  const latest = await fetchMyLatestAnalysis();
  if (latest === null) {
    return { latest: null, profile: null };
  }
  const profile = await fetchMyProfile();
  return { latest, profile };
}

export type UseAnalysisPageResult = {
  data: MeLatestAnalysisDto | null;
  profile: MeProfileDto | null;
  error: string | null;
  loading: boolean;
  reAnalyzeSubmitting: boolean;
  pollEnabled: boolean;
  redirecting: boolean;
  waitingPanel: boolean;
  showResults: boolean;
  analysisFailed: boolean;
  onReAnalyze: () => Promise<void>;
};

export function useAnalysisPage(loadFailedMessage: string): UseAnalysisPageResult {
  const router = useRouter();
  const [data, setData] = useState<MeLatestAnalysisDto | null>(null);
  const [profile, setProfile] = useState<MeProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reAnalyzeSubmitting, setReAnalyzeSubmitting] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const autoRedirectRef = useRef(false);
  const [redirecting, setRedirecting] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);
  const pollDelayRef = useRef(ANALYSIS_POLL_INITIAL_MS);

  const clearPoll = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    pollStartedAtRef.current = null;
    pollDelayRef.current = ANALYSIS_POLL_INITIAL_MS;
  }, []);

  const handleProfileTerminal = useCallback(
    async (p: MeProfileDto) => {
      if (p.status === 'ANALYZED') {
        const latest = await fetchMyLatestAnalysis();
        if (latest) setData(latest);
        if (autoRedirectRef.current) {
          setRedirecting(true);
          router.replace('/dating/me-matches');
          return;
        }
        setPollEnabled(false);
        clearPoll();
        return;
      }
      if (p.status === 'FAILED') {
        setPollEnabled(false);
        clearPoll();
      }
    },
    [clearPoll, router],
  );

  const runPollTick = useCallback(async () => {
    try {
      let profileStatus: string | undefined;
      try {
        const status = await fetchAnalysisStatus();
        profileStatus = status.profileStatus;
        if (status.status === 'complete' || status.status === 'failed') {
          const p = await fetchMyProfile();
          if (p) {
            setProfile(p);
            await handleProfileTerminal(p);
            return;
          }
        }
      } catch {
        /* fall through to profile poll */
      }
      const p = await fetchMyProfile();
      if (!p) return;
      setProfile(p);
      profileStatus = p.status;
      if (shouldStopPolling(profileStatus)) {
        await handleProfileTerminal(p);
        return;
      }
    } catch {
      /* keep polling */
    }

    if (
      pollStartedAtRef.current != null &&
      Date.now() - pollStartedAtRef.current >= ANALYSIS_POLL_MAX_DURATION_MS
    ) {
      setPollEnabled(false);
      clearPoll();
      return;
    }

    pollDelayRef.current = nextPollDelayMs(pollDelayRef.current);
    pollTimeoutRef.current = setTimeout(() => {
      void runPollTick();
    }, pollDelayRef.current);
  }, [clearPoll, handleProfileTerminal]);

  const startPoll = useCallback(
    (redirectOnComplete: boolean) => {
      clearPoll();
      autoRedirectRef.current = redirectOnComplete;
      setPollEnabled(true);
      pollStartedAtRef.current = Date.now();
      pollDelayRef.current = ANALYSIS_POLL_INITIAL_MS;
      pollTimeoutRef.current = setTimeout(() => {
        void runPollTick();
      }, pollDelayRef.current);
    },
    [clearPoll, runPollTick],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { latest, profile: p } = await loadAnalysisPageState();
        if (cancelled) return;
        if (latest === null) {
          router.replace('/onboarding');
          return;
        }
        setData(latest);
        setProfile(p);
        const redirectOnComplete = computeAutoRedirectOnComplete(
          p,
          latest.evaluationId,
        );
        if (redirectOnComplete) {
          startPoll(true);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : loadFailedMessage);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, startPoll, loadFailedMessage]);

  useEffect(() => {
    return () => {
      clearPoll();
    };
  }, [clearPoll]);

  const waitingPanel = shouldShowWaitingPanel(profile, data?.evaluationId);
  const showResults =
    !waitingPanel && profile?.status === 'ANALYZED' && !!data?.evaluationId;
  const analysisFailed = profile?.status === 'FAILED' && waitingPanel;

  async function onReAnalyze() {
    if (reAnalyzeSubmitting || isAnalysisInFlight(profile?.status)) {
      return;
    }
    setReAnalyzeSubmitting(true);
    startPoll(true);
    try {
      const updated = await submitMyProfileForAnalysis();
      setProfile(updated.profile);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (isAlreadyRunningSubmitError(msg)) {
        try {
          const p = await fetchMyProfile();
          if (p) setProfile(p);
        } catch {
          /* keep prior profile */
        }
      } else {
        clearPoll();
        setPollEnabled(false);
        autoRedirectRef.current = false;
      }
    } finally {
      setReAnalyzeSubmitting(false);
    }
  }

  return {
    data,
    profile,
    error,
    loading,
    reAnalyzeSubmitting,
    pollEnabled,
    redirecting,
    waitingPanel,
    showResults,
    analysisFailed,
    onReAnalyze,
  };
}
