'use client';

import Link from 'next/link';
import type { MatchHardBlockVM } from '@/lib/matches/match-view-models';
import { formatHardBlockReason } from '@/app/dating/me-matches/hard-block-display';
import type { AppCopySchema } from '@/lib/i18n/types';

type Props = {
  hardBlock: MatchHardBlockVM;
  currentAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
  detailCopy: AppCopySchema['matches']['detail'];
};

/** Amber banner when the match is hard-blocked from further actions. */
export function MatchDetailHardBlock({
  hardBlock,
  currentAction,
  detailCopy,
}: Props) {
  return (
    <div
      className="border-b border-amber-200 bg-amber-50 px-6 py-4 dark:border-amber-900/50 dark:bg-amber-950/30"
      role="region"
      aria-label={detailCopy.hardBlocked.banner}
      data-testid="match-detail-hard-blocked"
    >
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
        {detailCopy.hardBlocked.banner}
      </p>
      {currentAction === 'LIKE' && (
        <p className="mt-1 text-xs text-amber-800/90 dark:text-amber-200/90">
          {detailCopy.hardBlocked.youLikedThisProfile}
        </p>
      )}
      <p className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-200">
        {detailCopy.hardBlocked.reasonsHeading}
      </p>
      <ul className="mt-1 space-y-2">
        {hardBlock.reasons.map((r) => {
          const formatted = formatHardBlockReason(r, detailCopy.hardBlocked);
          return (
            <li
              key={`${r.direction}:${r.dimension}:${r.code}`}
              className="text-sm text-amber-950 dark:text-amber-50"
            >
              <p>{formatted.primary}</p>
              {formatted.evidence && (
                <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/80">
                  {formatted.evidence}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <Link
        href="/settings/preferences"
        className="mt-3 inline-block text-sm font-medium text-amber-900 underline-offset-4 hover:underline dark:text-amber-100"
      >
        {detailCopy.hardBlocked.reviewPreferences}
      </Link>
    </div>
  );
}
