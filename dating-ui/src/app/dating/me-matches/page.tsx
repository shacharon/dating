'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMyMatches, type MeMatchesListDto } from '@/lib/me-profile-api';

export default function MeMatchesPage() {
  const router = useRouter();
  const [data, setData] = useState<MeMatchesListDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchMyMatches()
      .then((dto) => {
        if (cancelled) return;
        if (dto.status === 'not_ready') {
          // Guard: send user to the appropriate step before showing matches.
          router.replace(dto.reason === 'no_profile' ? '/onboarding' : '/dating/analysis');
          return;
        }
        setData(dto);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load matches');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const matches = data?.status === 'ready' ? (data.matches ?? []) : [];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">

        {/* Nav */}
        <nav className="flex flex-wrap gap-4 text-sm">
          <Link
            href="/dating/analysis"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Your analysis
          </Link>
          <Link
            href="/onboarding"
            className="font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Edit profile
          </Link>
        </nav>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Your matches
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            People whose profile and preferences are compatible with yours.
          </p>
        </header>

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

        {/* Empty */}
        {!loading && !error && matches.length === 0 && (
          <div
            className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"
            role="status"
          >
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              No matches yet
            </p>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              This updates as more people join and complete their profiles.
            </p>
          </div>
        )}

        {/* Match list */}
        {!loading && !error && matches.length > 0 && (
          <ul className="flex flex-col gap-3">
            {matches.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/dating/me-matches/${m.id}`}
                  className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {[
                          m.gender,
                          m.ageYears != null ? `${m.ageYears}y` : null,
                          m.locationLabel,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {m.explainability?.reasonShort && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {m.explainability.reasonShort}
                        </p>
                      )}
                      {m.analyzedAt && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          Analyzed{' '}
                          {new Date(m.analyzedAt).toLocaleDateString(undefined, {
                            dateStyle: 'medium',
                          })}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {m.matchScore != null && (
                        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {m.matchScore}
                        </span>
                      )}
                      <span className="text-zinc-300 dark:text-zinc-600" aria-hidden>
                        →
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
