'use client';

import { MatchPhoto } from '@/components/match-photo';
import type { MeMatchDetailDto } from '@/lib/me-matches-api';
import {
  matchDetailSubtitle,
  matchDetailTitle,
} from '@/lib/matches/match-display';
import type { AppCopySchema } from '@/lib/i18n/types';

type Props = {
  data: MeMatchDetailDto;
  detailCopy: AppCopySchema['matches']['detail'];
};

/** Hero photo plus title/subtitle header for match detail. */
export function MatchDetailHeader({ data, detailCopy }: Props) {
  return (
    <>
      <MatchPhoto
        variant="hero"
        photoUrl={data.primaryPhotoUrl ?? null}
        displayName={matchDetailTitle(data)}
        testId="match-detail-photo"
      />
      <header className="border-b border-zinc-100 bg-zinc-50/80 px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900/80">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          {detailCopy.matchLabel}
        </p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {matchDetailTitle(data)}
        </h1>
        {matchDetailSubtitle(data) && (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {matchDetailSubtitle(data)}
          </p>
        )}
      </header>
    </>
  );
}
