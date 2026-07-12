'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchAnalysisStatus,
  fetchMyLatestAnalysis,
  fetchMyProfile,
  submitMyProfileForAnalysis,
  type MeProfileDto,
  type MeLatestAnalysisDto,
} from '@/lib/me-profile-api';
import { mapEvaluationToViewModel } from '@/lib/analysis-presentation';
import { AnalysisProgressPanel } from '@/components/analysis-progress-panel';
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
import { useAppLocale } from '@/lib/i18n';
import type { AppCopySchema } from '@/lib/i18n/types';

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
      {children}
    </h2>
  );
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{text}</p>
    </article>
  );
}

function ReferenceCard({
  title,
  text,
  copy,
}: {
  title: string;
  text: string | null;
  copy: AppCopySchema['analysisPage'];
}) {
  const limit = 220;
  const safeText = text?.trim() ? text.trim() : copy.referenceEmpty;
  const [expanded, setExpanded] = useState(false);
  const isLong = safeText.length > limit;
  const shownText =
    !isLong || expanded ? safeText : `${safeText.slice(0, limit).trimEnd()}...`;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/70">
      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</h3>
      <blockquote className="mt-2 border-l-2 border-zinc-300 pl-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        {shownText}
      </blockquote>
      {isLong && (
        <button
          type="button"
          className="mt-3 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? copy.showLess : copy.showMore}
        </button>
      )}
    </article>
  );
}

export default function DatingAnalysisPage() {
  const router = useRouter();
  const { locale, copy } = useAppLocale();
  const pageCopy = copy.analysisPage;
  const [data, setData] = useState<MeLatestAnalysisDto | null>(null);
  const [profile, setProfile] = useState<MeProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reAnalyzeSubmitting, setReAnalyzeSubmitting] = useState(false);
  const [pollEnabled, setPollEnabled] = useState(false);
  const [autoRedirectOnComplete, setAutoRedirectOnComplete] = useState(false);
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
      // Prefer dedicated status endpoint; fall back to profile GET.
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
      setAutoRedirectOnComplete(redirectOnComplete);
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
          setError(e instanceof Error ? e.message : pageCopy.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, startPoll]);

  useEffect(() => {
    return () => {
      clearPoll();
    };
  }, [clearPoll]);

  const waitingPanel = shouldShowWaitingPanel(profile, data?.evaluationId);
  const showResults =
    !waitingPanel && profile?.status === 'ANALYZED' && !!data?.evaluationId;
  const analysisFailed = profile?.status === 'FAILED' && waitingPanel;
  const vm = mapEvaluationToViewModel(data?.evaluationJson ?? null);

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
        setAutoRedirectOnComplete(false);
      }
    } finally {
      setReAnalyzeSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            {pageCopy.loading}
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            {pageCopy.loadFailed} {pageCopy.loadFailedHint}
          </div>
        )}

        {!loading && !error && waitingPanel && (
          <AnalysisProgressPanel
            profileStatus={profile?.status}
            failed={analysisFailed}
            redirecting={redirecting}
            onRetry={() => void onReAnalyze()}
          />
        )}

        {!loading && !error && showResults && data && (
          <>
            <section className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-6 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-3xl">
                    {vm.heroTitle}
                  </h1>
                  {vm.heroSubtitle && (
                    <p className="max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-base">
                      {vm.heroSubtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void onReAnalyze()}
                  disabled={reAnalyzeSubmitting || pollEnabled}
                  aria-busy={reAnalyzeSubmitting || pollEnabled}
                  data-testid="analysis-rerun-button"
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                >
                  {reAnalyzeSubmitting || pollEnabled
                    ? pageCopy.analysisRunning
                    : pageCopy.reRunAnalysis}
                </button>
              </div>
              {vm.note && (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">{vm.note}</p>
              )}
              {data.createdAt && (
                <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
                  {pageCopy.lastRunPrefix}{' '}
                  {new Date(data.createdAt).toLocaleString(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <SectionHeading>{pageCopy.sectionHowWeRead}</SectionHeading>
              <div className="grid gap-3 md:grid-cols-3">
                <InsightCard title={pageCopy.insightAboutYou} text={vm.aboutMeInsight} />
                <InsightCard title={pageCopy.insightHowYouRelate} text={vm.relationshipInsight} />
                <InsightCard
                  title={pageCopy.insightWhoYouWant}
                  text={vm.partnerPreferenceInsight}
                />
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeading>{pageCopy.sectionWhatYouWrote}</SectionHeading>
              <div className="grid gap-3 md:grid-cols-3">
                <ReferenceCard
                  title={pageCopy.referenceAboutMe}
                  text={profile?.aboutMe ?? null}
                  copy={pageCopy}
                />
                <ReferenceCard
                  title={pageCopy.referenceRelationshipStyle}
                  text={profile?.aboutRelationship ?? null}
                  copy={pageCopy}
                />
                <ReferenceCard
                  title={pageCopy.referencePartnerPreference}
                  text={profile?.aboutPartner ?? null}
                  copy={pageCopy}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
