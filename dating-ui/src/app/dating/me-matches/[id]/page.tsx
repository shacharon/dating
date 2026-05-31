'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchMyMatchById, type MeMatchDetailDto } from '@/lib/me-profile-api';

export default function MeMatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<MeMatchDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchMyMatchById(id)
      .then((dto) => {
        if (!cancelled) setData(dto);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load match');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">

        {/* Nav */}
        <nav>
          <Link
            href="/dating/me-matches"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Back to matches
          </Link>
        </nav>

        {/* Loading */}
        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            Loading…
          </p>
        )}

        {/* Error */}
        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Match detail */}
        {!loading && !error && data && (
          <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <header className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                Match
              </p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {[
                  data.gender,
                  data.ageYears != null ? `${data.ageYears} years old` : null,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </h1>
              {data.locationLabel && (
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {data.locationLabel}
                </p>
              )}
            </header>

            <div className="space-y-5 px-6 py-5 text-sm">

              {/* Score + explainability */}
              {data.matchScore != null && (
                <section className="flex items-start gap-4">
                  <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
                    <span className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {data.matchScore}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">score</span>
                  </div>
                  {data.explainability && (
                    <div className="min-w-0 space-y-2">
                      {data.explainability.positiveChips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {data.explainability.positiveChips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                            >
                              {chip}
                            </span>
                          ))}
                          {data.explainability.tensionChip && (
                            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                              {data.explainability.tensionChip}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {data.explainability.reasonShort}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {data.matchExplanationTraits && data.matchExplanationTraits.length > 0 && (
                <section className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Why you match
                  </p>
                  <ul className="mt-3 space-y-3">
                    {data.matchExplanationTraits.map((trait) => (
                      <li key={`${trait.group}-${trait.label}`} className="text-sm">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {trait.group}
                          </span>
                          <span
                            className={
                              trait.strength === 'strong'
                                ? 'text-xs font-medium text-emerald-600 dark:text-emerald-400'
                                : 'text-xs font-medium text-zinc-500 dark:text-zinc-400'
                            }
                          >
                            {trait.strength === 'strong' ? 'Strong' : 'Moderate'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {trait.evidence}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Recommendation takeaway */}
              {data.recommendation?.primaryTakeaway && (
                <section className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Takeaway
                  </p>
                  <p className="mt-1.5 leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {data.recommendation.primaryTakeaway}
                  </p>
                  {data.recommendation.caution && (
                    <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                      {data.recommendation.caution}
                    </p>
                  )}
                </section>
              )}

              {/* Analysis summary */}
              {data.evaluationSummary ? (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    About them
                  </p>
                  <p className="mt-2 leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {data.evaluationSummary}
                  </p>
                </section>
              ) : (
                <p className="text-zinc-400 dark:text-zinc-500">
                  No analysis summary available yet.
                </p>
              )}

              {data.analyzedAt && (
                <p className="text-xs text-zinc-300 dark:text-zinc-600">
                  Analyzed{' '}
                  {new Date(data.analyzedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
            </div>

            <footer className="flex justify-start border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
              <Link
                href="/dating/me-matches"
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Back to matches
              </Link>
            </footer>
          </article>
        )}
      </div>
    </div>
  );
}
