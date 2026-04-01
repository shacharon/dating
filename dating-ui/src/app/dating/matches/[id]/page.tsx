import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { MatchDetailApiResponse } from '../../_lib/types';
import { ChipsSection } from '../../../components/chips-section';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Props = { params: Promise<{ id: string }> };

async function fetchMatchDetail(id: string): Promise<MatchDetailApiResponse | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/matches/${encodeURIComponent(id)}`,
      { cache: 'no-store' },
    );

    if (res.status === 404) return null;
    if (!res.ok) return null;

    const data = (await res.json()) as MatchDetailApiResponse;
    if (!data?.ok || !data.id) return null;
    return data;
  } catch {
    return null;
  }
}

export default async function MatchDetailPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const match = await fetchMatchDetail(id);

  if (!match) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dating/matches"
          className="inline-block text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to matches
        </Link>

        <article className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8">
          <header className="border-b border-zinc-100 pb-6 dark:border-zinc-800">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {match.name}
            </h1>
          </header>

          <div className="mt-6 space-y-5 text-sm leading-relaxed">
            <p className="text-base text-zinc-800 dark:text-zinc-200">
              <span className="mr-1.5" aria-hidden>
                🔥
              </span>
              {match.primaryTakeaway}
            </p>

            {match.caution ? (
              <p className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <span className="mr-1.5" aria-hidden>
                  ⚠️
                </span>
                {match.caution}
              </p>
            ) : null}

            <ChipsSection
              title="Highlights"
              chips={{ attractionChips: match.chips }}
            />

            {match.expandedExplainability.length > 0 ? (
              <section>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Why this works
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-zinc-600 dark:text-zinc-400">
                  {match.expandedExplainability.map((line, i) => (
                    <li key={`${i}-${line.slice(0, 48)}`}>{line}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-200">
              <span className="mr-1.5" aria-hidden>
                👉
              </span>
              {match.suggestedNextAction}
            </p>
          </div>

          <footer className="mt-10 flex flex-col gap-3 border-t border-zinc-100 pt-8 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/dating/matches"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Back to matches
            </Link>
            <Link
              href={`/dating/feedback?matchId=${encodeURIComponent(match.id)}`}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Give feedback
            </Link>
          </footer>
        </article>
      </div>
    </div>
  );
}
