'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchMyLatestAnalysis,
  fetchMyProfile,
  submitMyProfileForAnalysis,
  type MeProfileDto,
  type MeLatestAnalysisDto,
} from '@/lib/me-profile-api';
import { mapEvaluationToViewModel } from '@/lib/analysis-presentation';

/** Matches API: submit is only allowed from DRAFT / ANALYZED / FAILED — not while a run is queued or in progress. */
function isAnalysisInFlight(profileStatus: string | undefined): boolean {
  return profileStatus === 'SUBMITTED' || profileStatus === 'ANALYZING';
}

const ANALYSIS_POLL_MS = 5000;

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
  const [reAnalyzeLoading, setReAnalyzeLoading] = useState(false);
  const [reAnalyzeFeedback, setReAnalyzeFeedback] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dto = await fetchMyLatestAnalysis();
        if (cancelled) return;
        if (dto === null) {
          // No profile yet — send to onboarding to create one.
          router.replace('/onboarding');
          return;
        }
        setData(dto);
        const p = await fetchMyProfile();
        if (!cancelled) {
          setProfile(p);
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
  }, [router]);

  const analysisInFlight = isAnalysisInFlight(profile?.status);

  useEffect(() => {
    if (!analysisInFlight) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const [latest, p] = await Promise.all([
            fetchMyLatestAnalysis(),
            fetchMyProfile(),
          ]);
          if (latest) setData(latest);
          if (p) setProfile(p);
        } catch {
          /* ignore transient poll errors */
        }
      })();
    }, ANALYSIS_POLL_MS);
    return () => window.clearInterval(id);
  }, [analysisInFlight]);

  const vm = mapEvaluationToViewModel(data?.evaluationJson ?? null);

  async function onReAnalyze() {
    if (analysisInFlight) return;
    setReAnalyzeFeedback(null);
    setReAnalyzeLoading(true);
    try {
      const updated = await submitMyProfileForAnalysis();
      setProfile(updated);
      setReAnalyzeFeedback(
        'Analysis started. This page will refresh when the new run finishes.',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (
        msg.includes('invalid_submit_state') ||
        msg.includes('ANALYZING') ||
        msg.includes('SUBMITTED')
      ) {
        setReAnalyzeFeedback(
          'Analysis is already running. Wait for it to finish, then you can re-run.',
        );
        void fetchMyProfile().then((p) => {
          if (p) setProfile(p);
        });
      } else {
        setReAnalyzeFeedback('Could not start analysis. Try again.');
      }
    } finally {
      setReAnalyzeLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">

        {/* Loading / redirecting */}
        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            Loading analysis…
          </p>
        )}

        {/* Error (network / server fault — not a missing-profile 404) */}
        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            We couldn't load your analysis. Try again.
          </div>
        )}

        {/* No evaluation yet (profile exists but analysis hasn't run) */}
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
              onClick={() => router.push('/onboarding')}
              className="mt-4 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Edit profile
            </button>
          </div>
        )}

        {/* Analysis result — driven entirely by view model */}
        {!loading && !error && data?.evaluationId && (
          <>
            {/* Hero */}
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
                  disabled={reAnalyzeLoading || analysisInFlight}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
                >
                  {reAnalyzeLoading
                    ? 'Starting…'
                    : analysisInFlight
                      ? 'Analysis running…'
                      : 'Re-run analysis'}
                </button>
              </div>
              {analysisInFlight && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400" role="status">
                  Your profile is being analyzed. This can take a minute—the page
                  updates automatically when it is done.
                </p>
              )}
              {vm.note && (
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">{vm.note}</p>
              )}
              {reAnalyzeFeedback && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400" role="status">
                  {reAnalyzeFeedback}
                </p>
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

            {/* Three compact insight cards */}
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

            {/* User original text reference */}
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
