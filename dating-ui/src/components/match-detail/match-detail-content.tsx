'use client';

import type { ReactNode } from 'react';
import type { MeMatchDetailDto } from '@/lib/me-matches-api';
import { formatSharedInterestNote } from '@/lib/enrichment-display-v1';
import {
  resolveDetailProse,
  splitNarrativeParagraphs,
} from '@/app/dating/me-matches/[id]/match-detail-prose';
import type { AppCopySchema, AppLocale } from '@/lib/i18n/types';

type Props = {
  data: MeMatchDetailDto;
  locale: AppLocale;
  detailCopy: AppCopySchema['matches']['detail'];
  /** Rendered after shared interests, before caution (preserves prior layout). */
  feedbackSlot?: ReactNode;
};

/**
 * Bio, narrative, shared interests, and optional feedback slot (before caution).
 */
export function MatchDetailContent({
  data,
  locale,
  detailCopy,
  feedbackSlot,
}: Props) {
  const prose = resolveDetailProse(data);
  const sharedNote = formatSharedInterestNote(
    data.explainability?.sharedInterestNote,
  );

  return (
    <div className="space-y-5 px-6 py-5 text-sm">
      {prose?.kind === 'narrative' && (
        <div
          data-testid="match-detail-narrative"
          className="space-y-3 text-base leading-7 text-zinc-800 dark:text-zinc-200"
        >
          {splitNarrativeParagraphs(prose.text).map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )}
      {prose?.kind === 'short' && (
        <p
          data-testid="match-detail-takeaway"
          className="text-base leading-relaxed text-zinc-800 dark:text-zinc-200"
        >
          {prose.text}
        </p>
      )}
      {sharedNote ? (
        <p
          data-testid="match-detail-shared-interests"
          className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
        >
          {sharedNote}
        </p>
      ) : null}
      {feedbackSlot}
      {data.recommendation?.caution ? (
        <section className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            {data.recommendation.caution}
          </p>
        </section>
      ) : null}
      {data.analyzedAt && (
        <p className="text-xs text-zinc-300 dark:text-zinc-600">
          {detailCopy.analyzedPrefix}{' '}
          {new Date(data.analyzedAt).toLocaleString(locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </p>
      )}
    </div>
  );
}
