'use client';

import Link from 'next/link';
import { MatchPhoto } from '@/components/match-photo';
import { type MeMatchItemDto } from '@/lib/me-matches-api';
import { formatSharedInterestNote } from '@/lib/enrichment-display-v1';
import type { AppCopySchema, AppLocale } from '@/lib/i18n';
import {
  matchListPrimaryLabel,
  matchListSecondaryMeta,
} from './match-display';
import { formatHardBlockReason } from './hard-block-display';
import { markMatchesScrollForRestore } from './me-matches-scroll';

type ListCopy = AppCopySchema['matches']['list'];

function matchActionBadge(
  action: NonNullable<MeMatchItemDto['yourAction']>,
  copy: ListCopy['actionBadge'],
) {
  switch (action) {
    case 'LIKE':
      return copy.liked;
    case 'PASS':
      return copy.passed;
    case 'BLOCK':
      return copy.blocked;
  }
}

export function MatchListItem({
  match: m,
  index,
  locale,
  listCopy,
}: {
  match: MeMatchItemDto;
  index: number;
  locale: AppLocale;
  listCopy: ListCopy;
}) {
  const hardBlocked = m.hardBlocked;
  const secondary = matchListSecondaryMeta(m);
  const sharedNote = hardBlocked
    ? null
    : formatSharedInterestNote(m.explainability?.sharedInterestNote);
  const actionBadge =
    !hardBlocked && m.yourAction != null
      ? matchActionBadge(m.yourAction, listCopy.actionBadge)
      : null;
  const firstHardReason = hardBlocked?.reasons[0];
  const formattedHardReason = firstHardReason
    ? formatHardBlockReason(firstHardReason, listCopy.hardBlocked)
    : null;

  return (
    <li>
      <Link
        href={`/dating/me-matches/${m.id}`}
        scroll={false}
        onClick={() => markMatchesScrollForRestore()}
        className={
          hardBlocked
            ? 'block rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20'
            : 'block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800/60'
        }
      >
        <div className="flex items-start gap-4">
          <MatchPhoto
            variant="list"
            photoUrl={m.primaryPhotoUrl ?? null}
            displayName={matchListPrimaryLabel(m)}
            priority={index < 3}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {matchListPrimaryLabel(m)}
            </p>
            {hardBlocked && m.yourAction === 'LIKE' && (
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {listCopy.hardBlocked.youLikedThisProfile}
              </p>
            )}
            {secondary ? (
              <p className="truncate text-xs text-zinc-600 dark:text-zinc-300">
                {secondary}
              </p>
            ) : null}
            {hardBlocked && (
              <div className="space-y-1.5 pt-1">
                <span
                  className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                  aria-label={listCopy.hardBlocked.badgeAria}
                >
                  {listCopy.hardBlocked.badge}
                </span>
                {formattedHardReason && (
                  <div className="space-y-1">
                    <p className="text-sm text-zinc-800 dark:text-zinc-200">
                      {formattedHardReason.primary}
                    </p>
                    {formattedHardReason.evidence && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formattedHardReason.evidence}
                      </p>
                    )}
                    {hardBlocked.reasons.length > 1 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {listCopy.hardBlocked.moreReasonsCount(
                          hardBlocked.reasons.length - 1,
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            {!hardBlocked && m.recommendation?.primaryTakeaway?.trim() && (
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {m.recommendation.primaryTakeaway.trim()}
              </p>
            )}
            {sharedNote ? (
              <p
                data-testid="match-list-shared-interests"
                className="truncate text-xs text-emerald-700 dark:text-emerald-400"
              >
                {sharedNote}
              </p>
            ) : null}
            {m.analyzedAt && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {listCopy.updatedPrefix}{' '}
                {new Date(m.analyzedAt).toLocaleDateString(locale, {
                  dateStyle: 'medium',
                })}
              </p>
            )}
          </div>
          {!hardBlocked && (
            <div className="flex shrink-0 items-center gap-2 self-center">
              {actionBadge && m.yourAction != null && (
                <span
                  className={
                    m.yourAction === 'LIKE'
                      ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : m.yourAction === 'PASS'
                        ? 'rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                        : 'rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400'
                  }
                  aria-label={actionBadge.ariaLabel}
                >
                  {actionBadge.label}
                </span>
              )}
              {m.matchScore != null && (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {m.matchScore}
                </span>
              )}
              <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
                →
              </span>
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
