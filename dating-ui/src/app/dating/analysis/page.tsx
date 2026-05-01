'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  fetchMyLatestAnalysis,
  type MeLatestAnalysisDto,
} from '@/lib/me-profile-api';
import { mapEvaluationToViewModel } from '@/lib/analysis-presentation';

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
      {children}
    </h2>
  );
}

function TraitCard({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      {label}
    </div>
  );
}

function MissingCard({ prompt }: { prompt: string }) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
      <span className="mt-0.5 shrink-0 text-zinc-300 dark:text-zinc-600">›</span>
      {prompt}
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DatingAnalysisPage() {
  const router = useRouter();
  const [data, setData] = useState<MeLatestAnalysisDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load analysis');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const vm = mapEvaluationToViewModel(data?.evaluationJson ?? null);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-10">

        {/* Nav */}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/onboarding"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Edit profile
          </Link>
          <Link
            href="/dating/me-matches"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View matches →
          </Link>
        </div>

        {/* Loading / redirecting */}
        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            Loading your analysis…
          </p>
        )}

        {/* Error (network / server fault — not a missing-profile 404) */}
        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            Something went wrong loading your analysis. Please try again.
          </div>
        )}

        {/* No evaluation yet (profile exists but analysis hasn't run) */}
        {!loading && !error && data && !data.evaluationId && (
          <div className="space-y-3">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Nothing here yet
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Fill in your profile fields and run{' '}
              <strong className="text-zinc-700 dark:text-zinc-300">
                Analyze
              </strong>{' '}
              to get your first picture.
            </p>
            <Link
              href="/onboarding"
              className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Go to profile
            </Link>
          </div>
        )}

        {/* Analysis result — driven entirely by view model */}
        {!loading && !error && data?.evaluationId && (
          <>
            {/* Hero */}
            <section className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {vm.heroTitle}
              </h1>
              {vm.heroSubtitle && (
                <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {vm.heroSubtitle}
                </p>
              )}
              {vm.note && (
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  {vm.note}
                </p>
              )}
            </section>

            {/* What stands out about you */}
            {vm.selfHighlights.length > 0 && (
              <section className="space-y-3">
                <SectionHeading>What we're picking up about you</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {vm.selfHighlights.map((label) => (
                    <TraitCard key={label} label={label} />
                  ))}
                </div>
              </section>
            )}

            {/* What you seem to look for */}
            {vm.partnerHighlights.length > 0 && (
              <section className="space-y-3">
                <SectionHeading>What you seem to look for</SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {vm.partnerHighlights.map((label) => (
                    <TraitCard key={label} label={label} />
                  ))}
                </div>
              </section>
            )}

            {/* What would sharpen this picture — only when sparse */}
            {vm.missingPieces.length > 0 && (
              <section className="space-y-3">
                <SectionHeading>What would sharpen this picture</SectionHeading>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  We're working from what you've shared so far. A little more
                  will help us understand you better.
                </p>
                <ul className="space-y-2">
                  {vm.missingPieces.map((prompt) => (
                    <MissingCard key={prompt} prompt={prompt} />
                  ))}
                </ul>
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  Add a few sentences to any of the three profile fields, then
                  run Analyze again.
                </p>
              </section>
            )}

            {/* Timestamp */}
            {data.createdAt && (
              <p className="text-xs text-zinc-300 dark:text-zinc-700">
                Updated{' '}
                {new Date(data.createdAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
