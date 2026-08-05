'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import type {
  BreakdownMatchLevel,
  CompatibilityBreakdownDto,
} from '@/lib/me-matches-api';
import type { AppCopySchema } from '@/lib/i18n/types';
import { emitProductLog } from '@/lib/observability/product-logger';

export type MatchCompatibilityBreakdownProps = {
  candidateProfileId: string;
  matchScore: number | null;
  breakdown: CompatibilityBreakdownDto;
  copy: AppCopySchema['matches']['detail']['breakdown'];
};

function priorityTierFromScore(
  score: number | null,
): 'HIGH' | 'GOOD' | 'OTHER' {
  if (score == null || !Number.isFinite(score)) return 'OTHER';
  if (score >= 85) return 'HIGH';
  if (score >= 70) return 'GOOD';
  return 'OTHER';
}

function matchLevelClass(level: BreakdownMatchLevel): string {
  if (level === 'high') {
    return 'text-emerald-800 dark:text-emerald-300';
  }
  if (level === 'medium') {
    return 'text-zinc-700 dark:text-zinc-300';
  }
  return 'text-amber-800 dark:text-amber-300';
}

/**
 * Collapsed-by-default “How we calculated this” — component scores, not blend weights.
 */
export function MatchCompatibilityBreakdown({
  candidateProfileId,
  matchScore,
  breakdown,
  copy,
}: MatchCompatibilityBreakdownProps) {
  const [open, setOpen] = useState(false);
  const score = matchScore ?? breakdown.finalScore;

  function expand() {
    if (!open) {
      emitProductLog({
        level: 'trace',
        route: `/dating/me-matches/${candidateProfileId}`,
        message: 'match_breakdown_expanded',
        meta: {
          event: 'match_breakdown_expanded',
          candidateProfileId,
          matchScore: score,
          priorityTier: priorityTierFromScore(score),
        },
      });
    }
    setOpen((v) => !v);
  }

  return (
    <div data-testid="match-compatibility-breakdown">
      <button
        type="button"
        data-testid="match-breakdown-toggle"
        aria-expanded={open}
        aria-controls="match-breakdown-panel"
        onClick={expand}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-left text-sm font-medium text-zinc-700 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500/60 dark:text-zinc-200 dark:ring-offset-zinc-900"
      >
        <span>
          {open ? copy.headingWithScore(score) : copy.toggle}
        </span>
        <span className="text-zinc-400" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      <div
        id="match-breakdown-panel"
        data-testid="match-breakdown-panel"
        hidden={!open}
        className="space-y-4 pb-1 pt-1"
      >
        {open ? (
          <>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              {copy.honestyNote}
            </p>

            <BreakdownSection
              testId="match-breakdown-values"
              title={copy.valuesTitle}
              score={breakdown.values.score}
              scoreLabel={copy.scoreLabel}
            >
              <SignalList
                signals={breakdown.values.signals}
                bandsLabel={copy.bandsLabel}
                matchLabels={copy.matchLevel}
              />
            </BreakdownSection>

            {breakdown.personality ? (
              <BreakdownSection
                testId="match-breakdown-personality"
                title={copy.personalityTitle}
                score={breakdown.personality.score}
                scoreLabel={copy.scoreLabel}
              >
                <SignalList
                  signals={breakdown.personality.signals}
                  bandsLabel={copy.bandsLabel}
                  matchLabels={copy.matchLevel}
                />
              </BreakdownSection>
            ) : null}

            <BreakdownSection
              testId="match-breakdown-interests"
              title={copy.interestsTitle}
              score={breakdown.interests.score}
              scoreLabel={copy.scoreLabel}
            >
              {breakdown.interests.sharedCount > 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {copy.sharedCount(breakdown.interests.sharedCount)}
                </p>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {copy.noSharedInterests}
                </p>
              )}
              {breakdown.interests.shared.length > 0 ? (
                <ul
                  className="mt-2 flex flex-wrap gap-2"
                  data-testid="match-breakdown-interest-tags"
                >
                  {breakdown.interests.shared.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </BreakdownSection>

            {breakdown.challenges ? (
              <section
                data-testid="match-breakdown-challenges"
                className="rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-3 dark:border-amber-900/50 dark:bg-amber-950/20"
              >
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {copy.challengesTitle}
                </h3>
                <ul className="mt-2 space-y-2">
                  {breakdown.challenges.areas.map((area) => (
                    <li key={area.id} className="text-sm text-amber-950 dark:text-amber-100">
                      <span className="font-medium">{area.label}</span>
                      {area.note ? (
                        <span className="mt-0.5 block text-xs text-amber-800/90 dark:text-amber-200/80">
                          {area.note}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <Link
              href="/about/algorithm?from=detail"
              className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
              data-testid="match-breakdown-learn-more"
            >
              {copy.learnMore}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

function BreakdownSection({
  testId,
  title,
  score,
  scoreLabel,
  children,
}: {
  testId: string;
  title: string;
  score: number;
  scoreLabel: (n: number) => string;
  children: ReactNode;
}) {
  return (
    <section
      data-testid={testId}
      className="rounded-lg border border-emerald-100/80 bg-emerald-50/30 px-3 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
          {title}
        </h3>
        <span className="text-sm font-medium tabular-nums text-emerald-800 dark:text-emerald-300">
          {scoreLabel(score)}
        </span>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function SignalList({
  signals,
  bandsLabel,
  matchLabels,
}: {
  signals: CompatibilityBreakdownDto['values']['signals'];
  bandsLabel: (your: string, their: string) => string;
  matchLabels: AppCopySchema['matches']['detail']['breakdown']['matchLevel'];
}) {
  if (signals.length === 0) return null;
  return (
    <ul className="space-y-2">
      {signals.map((s) => (
        <li key={s.key} className="text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-medium text-zinc-800 dark:text-zinc-100">
              {s.label}
            </span>
            <span
              className={`text-xs font-medium uppercase tracking-wide ${matchLevelClass(s.match)}`}
            >
              {matchLabels[s.match]}
            </span>
          </div>
          {s.yourBand && s.theirBand ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {bandsLabel(s.yourBand, s.theirBand)}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
