import Link from 'next/link';
import { notFound } from 'next/navigation';
import type {
  MatchDetailApiResponse,
  MatchDetailChildrenUnsure,
} from '../../_lib/types';
import { ChipsSection } from '../../../components/chips-section';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Props = { params: Promise<{ id: string }> };

function formatConfidence(value: number): string {
  if (value > 0 && value <= 1) {
    return `${Math.round(value * 100)}%`;
  }
  return String(value);
}

type MatchDetailResolved = Omit<MatchDetailApiResponse, 'children_unsure'> & {
  children_unsure: MatchDetailChildrenUnsure;
};

async function fetchMatchDetail(id: string): Promise<MatchDetailResolved> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/matches/${encodeURIComponent(id)}`,
    { cache: 'no-store' },
  );

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error(`Could not load match (${res.status})`);
  }

  const data = (await res.json()) as MatchDetailApiResponse;
  if (!data?.ok || !data.id) {
    throw new Error('Invalid match response');
  }

  const children_unsure = data.children_unsure ?? {
    profile_a_to_profile_b: false,
    profile_b_to_profile_a: false,
  };

  return { ...data, children_unsure };
}

export default async function MatchDetailPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);
  const match = await fetchMatchDetail(id);

  const pa = match.profileA;
  const pb = match.profileB;
  const hasPair =
    Boolean(pa?.name) && Boolean(pb?.name) && Boolean(pa?.id) && Boolean(pb?.id);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dating/matches"
          className="inline-block text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Back to matches
        </Link>

        <article className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:mt-8">
          <header className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-6 dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-8">
            {hasPair && pa && pb ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Match
                </p>
                <h1 className="mt-2 text-xl font-semibold leading-snug tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-2xl">
                  <span className="block sm:inline">{pa.name}</span>
                  <span className="mx-0 block text-zinc-400 sm:mx-2 sm:inline">·</span>
                  <span className="block sm:inline">{pb.name}</span>
                </h1>
              </>
            ) : (
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {match.name}
              </h1>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(match.children_unsure.profile_a_to_profile_b ||
                match.children_unsure.profile_b_to_profile_a) && (
                <span
                  className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100"
                  data-testid="match-badge-children-unsure"
                >
                  Not sure about kids
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-6">
              {typeof match.score === 'number' ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Score
                  </p>
                  <p
                    className="mt-0.5 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
                    aria-label={`Compatibility score ${match.score} out of 100`}
                  >
                    {match.score}
                  </p>
                </div>
              ) : null}
              {match.confidence != null && Number.isFinite(match.confidence) ? (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Confidence
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                    {formatConfidence(match.confidence)}
                  </p>
                </div>
              ) : null}
            </div>
          </header>

          <div className="space-y-8 px-6 py-6 text-sm leading-relaxed sm:px-8 sm:py-8">
            <section aria-labelledby="rec-heading">
              <h2
                id="rec-heading"
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Recommendation
              </h2>
              <div className="mt-4 space-y-5 border-l-2 border-zinc-200 pl-4 dark:border-zinc-600">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Takeaway
                  </p>
                  <p className="mt-1.5 text-base font-medium text-zinc-900 dark:text-zinc-100">
                    {match.primaryTakeaway}
                  </p>
                </div>
                {match.caution ? (
                  <div
                    className="rounded-lg border border-amber-200/90 bg-amber-50 px-3 py-2.5 dark:border-amber-900/45 dark:bg-amber-950/25"
                    role="note"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/90 dark:text-amber-200/90">
                      Caution
                    </p>
                    <p className="mt-1 text-sm text-amber-950 dark:text-amber-100">
                      {match.caution}
                    </p>
                  </div>
                ) : null}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-800/40">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Suggested next step
                  </p>
                  <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                    {match.suggestedNextAction}
                  </p>
                </div>
              </div>
            </section>

            <section aria-labelledby="expl-heading">
              <h2
                id="expl-heading"
                className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Explainability
              </h2>
              <div className="mt-4 space-y-5 border-l-2 border-zinc-200 pl-4 dark:border-zinc-600">
                {match.reasonShort ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Summary
                    </p>
                    <p className="mt-1.5 text-base text-zinc-800 dark:text-zinc-200">
                      {match.reasonShort}
                    </p>
                  </div>
                ) : null}

                {match.tensionChip ? (
                  <div
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-600 dark:bg-zinc-800/50"
                    aria-label="Tension"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Tension
                    </p>
                    <p className="mt-1 text-sm text-zinc-800 dark:text-zinc-200">
                      {match.tensionChip}
                    </p>
                  </div>
                ) : null}

                <ChipsSection
                  title="What lines up"
                  chips={{ attractionChips: match.chips }}
                />

                {match.expandedExplainability.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      More context
                    </p>
                    <ul className="mt-2 list-disc space-y-2 pl-5 text-zinc-600 dark:text-zinc-400">
                      {match.expandedExplainability.map((line, i) => (
                        <li key={`${i}-${line.slice(0, 48)}`}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <footer className="flex flex-col gap-3 border-t border-zinc-100 px-6 py-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between sm:px-8">
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
