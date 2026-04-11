import Link from 'next/link';
import type { GenericMatchCardModel } from '../_lib/matches-list';

type Props = { match: GenericMatchCardModel };

export function MatchCard({ match }: Props) {
  const href = `/dating/matches/${encodeURIComponent(match.id)}`;

  return (
    <Link
      href={href}
      className="block rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:border-zinc-300 hover:bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-900/80"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {match.pairLabel}
          </h2>
          {match.childrenUnsure ? (
            <p className="mt-2">
              <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100">
                Kids intent unclear
              </span>
            </p>
          ) : null}
          {match.reasonShort ? (
            <p
              className="mt-1.5 text-sm leading-snug text-zinc-600 dark:text-zinc-400"
              data-testid="match-card-reason-short"
            >
              {match.reasonShort}
            </p>
          ) : null}
        </div>
        <div
          className="shrink-0 rounded-lg bg-zinc-100 px-3 py-2 text-center dark:bg-zinc-800"
          aria-label={`Score ${match.score} out of 100`}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Score
          </p>
          <p className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {match.score}
          </p>
        </div>
      </div>

      {match.chips.length > 0 ? (
        <ul
          className="mt-3 flex flex-wrap gap-1.5"
          aria-label="Highlights"
          data-testid="match-card-chips"
        >
          {match.chips.map((chip) => (
            <li
              key={chip}
              className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            >
              {chip}
            </li>
          ))}
        </ul>
      ) : null}

      {match.primaryTakeaway ? (
        <p
          className="mt-3 text-sm font-medium leading-snug text-zinc-800 dark:text-zinc-200"
          data-testid="match-card-primary-takeaway"
        >
          {match.primaryTakeaway}
        </p>
      ) : null}

      {match.holyGrailDiagnostics ? (
        <p
          className="mt-3 text-xs leading-snug text-zinc-500 dark:text-zinc-400"
          data-testid="match-card-hg-diagnostics"
          aria-label="Holy Grail diagnostic summary"
        >
          HG (diagnostic): mutual pass {match.holyGrailDiagnostics.hgMutualPass ? 'yes' : 'no'} · overall{' '}
          {match.holyGrailDiagnostics.hgOverallStatus} · soft-pass dims{' '}
          {match.holyGrailDiagnostics.hgRankScore}
        </p>
      ) : null}
    </Link>
  );
}
