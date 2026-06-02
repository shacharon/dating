'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchMyLatestAnalysis,
  fetchMyProfile,
  submitMyProfileForAnalysis,
  type MeProfileDto,
  type MeLatestAnalysisDto,
} from '@/lib/me-profile-api';
import { mapEvaluationToViewModel } from '@/lib/analysis-presentation';
import {
  ANALYSIS_STATUS_CHECK_FIRST_MS,
  ANALYSIS_STATUS_CHECK_SECOND_MS,
  isAlreadyRunningSubmitError,
  isAnalysisInFlight,
  runFeedbackAfterStatusCheck,
  RUN_FEEDBACK,
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

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
      {children}
    </h2>
  );
}

function InsightCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-sm shadow-zinc-200/40 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{text}</p>
    </article>
  );
}

function ReferenceCard({ title, text }: { title: string; text: string | null }) {
  const limit = 220;
  const safeText = text?.trim() ? text.trim() : 'Nothing saved here yet.';
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
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DatingAnalysisPage() {
  const router = useRouter();
  const [data, setData] = useState<MeLatestAnalysisDto | null>(null);
  const [profile, setProfile] = useState<MeProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reAnalyzeSubmitting, setReAnalyzeSubmitting] = useState(false);
  const [reRunLocked, setReRunLocked] = useState(false);
  const [runFeedback, setRunFeedback] = useState<string | null>(null);
  const [refreshHintShown, setRefreshHintShown] = useState(false);
  const statusCheckTimeoutsRef = useRef<
    ReturnType<typeof setTimeout>[]
  >([]);

  const clearStatusChecks = useCallback(() => {
    for (const id of statusCheckTimeoutsRef.current) {
      clearTimeout(id);
    }
    statusCheckTimeoutsRef.current = [];
  }, []);

  const applyLoadedState = useCallback(
    (latest: MeLatestAnalysisDto, p: MeProfileDto | null) => {
      setData(latest);
      setProfile(p);
    },
    [],
  );

  const scheduleStatusChecksRef = useRef<() => void>(() => {});

  const performStatusCheck = useCallback(
    async (checkIndex: 1 | 2): Promise<boolean> => {
      try {
        const { latest, profile: p } = await loadAnalysisPageState();
        if (latest) setData(latest);
        if (p) setProfile(p);

        const nextFeedback = runFeedbackAfterStatusCheck(
          checkIndex,
          p?.status,
        );
        if (nextFeedback === null) {
          clearStatusChecks();
          setRunFeedback(null);
          setRefreshHintShown(false);
          setReRunLocked(false);
          return false;
        }
        if (checkIndex === 2 && nextFeedback !== undefined) {
          setRefreshHintShown(true);
        } else if (nextFeedback !== undefined) {
          setRunFeedback(nextFeedback);
        }
        return true;
      } catch {
        if (checkIndex === 2) {
          setRefreshHintShown(true);
        }
        return true;
      }
    },
    [clearStatusChecks],
  );

  const scheduleStatusChecks = useCallback(() => {
    clearStatusChecks();
    statusCheckTimeoutsRef.current = [
      setTimeout(() => {
        void performStatusCheck(1);
      }, ANALYSIS_STATUS_CHECK_FIRST_MS),
      setTimeout(() => {
        void performStatusCheck(2);
      }, ANALYSIS_STATUS_CHECK_SECOND_MS),
    ];
  }, [clearStatusChecks, performStatusCheck]);

  scheduleStatusChecksRef.current = scheduleStatusChecks;

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
        applyLoadedState(latest, p);
        if (isAnalysisInFlight(p?.status)) {
          setReRunLocked(true);
          setRunFeedback(RUN_FEEDBACK.inProgress);
          scheduleStatusChecksRef.current();
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Could not load analysis.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, applyLoadedState]);

  useEffect(() => {
    return () => {
      clearStatusChecks();
    };
  }, [clearStatusChecks]);

  const analysisInFlight = isAnalysisInFlight(profile?.status);
  const vm = mapEvaluationToViewModel(data?.evaluationJson ?? null);

  async function onReAnalyze() {
    if (reAnalyzeSubmitting || analysisInFlight || reRunLocked) {
      return;
    }

    setReRunLocked(true);
    setRefreshHintShown(false);
    setRunFeedback(RUN_FEEDBACK.inProgress);
    setReAnalyzeSubmitting(true);
    scheduleStatusChecks();
    try {
      const updated = await submitMyProfileForAnalysis();
      setProfile(updated);
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
        clearStatusChecks();
        setRunFeedback(RUN_FEEDBACK.submitFailed);
        setRefreshHintShown(false);
        setReRunLocked(false);
      }
    } finally {
      setReAnalyzeSubmitting(false);
    }
  }

  const reRunButtonDisabled =
    reAnalyzeSubmitting || analysisInFlight || reRunLocked;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">

        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            Loading analysis…
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            We couldn't load your analysis. Try again.
          </div>
        )}

        {!loading && !error && data && !data.evaluationId && (
          <div className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              No analysis yet
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Complete your profile and submit for analysis—this page will fill in automatically.
            </p>
            <button
              type="button"
              onClick={() => router.push('/onboarding/basic?edit=1')}
              className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Edit profile
            </button>
          </div>
        )}

        {!loading && !error && data?.evaluationId && (
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
                  disabled={reRunButtonDisabled}
                  aria-busy={reAnalyzeSubmitting || analysisInFlight}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                >
                  {reAnalyzeSubmitting
                    ? 'Starting…'
                    : analysisInFlight
                      ? 'Analysis running…'
                      : 'Re-run analysis'}
                </button>
              </div>
              {(runFeedback || refreshHintShown) && (
                <p
                  className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
                  role="status"
                  data-testid="analysis-run-feedback"
                >
                  {refreshHintShown
                    ? RUN_FEEDBACK.stillRunningRefresh
                    : runFeedback}
                </p>
              )}
              {vm.note && (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">{vm.note}</p>
              )}
              {data.createdAt && (
                <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-600">
                  Last run{' '}
                  {new Date(data.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <SectionHeading>How we read your profile</SectionHeading>
              <div className="grid gap-3 md:grid-cols-3">
                <InsightCard title="About you" text={vm.aboutMeInsight} />
                <InsightCard title="How you relate" text={vm.relationshipInsight} />
                <InsightCard
                  title="Who you want"
                  text={vm.partnerPreferenceInsight}
                />
              </div>
            </section>

            <section className="space-y-3">
              <SectionHeading>What you wrote</SectionHeading>
              <div className="grid gap-3 md:grid-cols-3">
                <ReferenceCard title="About me" text={profile?.aboutMe ?? null} />
                <ReferenceCard
                  title="Relationship style"
                  text={profile?.aboutRelationship ?? null}
                />
                <ReferenceCard
                  title="Partner preference"
                  text={profile?.aboutPartner ?? null}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
