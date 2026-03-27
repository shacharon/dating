import Link from 'next/link';
import type { DatingMatchPreview } from '../_lib/types';
import { MatchRecommendationSection } from './match-recommendation-section';
import { MatchExplainabilitySection } from './match-explainability-section';

type Props = { match: DatingMatchPreview };

export function MatchCard({ match }: Props) {
  const href = `/dating/matches/${encodeURIComponent(match.id)}`;
  const hasRecommendation = match.recommendation != null;
  const hasExplainability = match.explainability != null;

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {match.name}
            <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
              {match.age}
            </span>
          </h2>
          <p className="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            {match.id}
          </p>
        </div>
        <div className="rounded-lg bg-zinc-100 px-3 py-1.5 text-center dark:bg-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Match
          </p>
          <p
            className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100"
            aria-label={`Compatibility score ${match.compatibilityScore} out of 100`}
          >
            {match.compatibilityScore}
          </p>
        </div>
      </header>

      {/* Recommendation Section - Decision-oriented card (new layer) */}
      {hasRecommendation && (
        <MatchRecommendationSection recommendation={match.recommendation} variant="card" />
      )}

      {/* Explainability Section - Chips and reason (existing layer) */}
      {hasExplainability ? (
        <MatchExplainabilitySection explainability={match.explainability} variant="card" />
      ) : !hasRecommendation ? (
        <>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{match.summary}</p>

          <div className="space-y-2 text-sm">
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-200">Why it works</p>
              <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{match.strongReason}</p>
            </div>
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Worth noting</p>
              <p className="mt-0.5 text-zinc-600 dark:text-zinc-400">{match.frictionPoint}</p>
            </div>
          </div>
        </>
      ) : null}

      <Link
        href={href}
        className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
      >
        View profile
      </Link>
    </article>
  );
}
