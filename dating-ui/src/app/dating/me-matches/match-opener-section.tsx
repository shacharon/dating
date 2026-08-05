'use client';

import { useEffect, useRef } from 'react';
import type { MeMatchItemDto } from '@/lib/me-matches-api';
import { postOpenerLifecycleBestEffort } from '@/lib/me-matches-api';
import type { AppCopySchema } from '@/lib/i18n/types';
import { emitProductLog } from '@/lib/observability/product-logger';
import { matchListPrimaryLabel } from './match-display';

export type MatchOpenerSectionProps = {
  match: MeMatchItemDto;
  browse: AppCopySchema['matches']['list']['browse'];
  /** Current viewer action toward this match. */
  currentAction: MeMatchItemDto['yourAction'];
  actionLoading: boolean;
  onLikeAndUse: () => void | Promise<void>;
};

/**
 * HIGH-only conversation opener block (Architect lock — emerald/zinc).
 */
export function MatchOpenerSection({
  match,
  browse,
  currentAction,
  actionLoading,
  onLikeAndUse,
}: MatchOpenerSectionProps) {
  const opener = match.suggestedOpener?.trim() ?? '';
  const displayedRef = useRef(false);
  const displayName = matchListPrimaryLabel(match);
  const waiting = currentAction === 'LIKE';
  const canUse = !waiting && currentAction !== 'BLOCK';

  useEffect(() => {
    if (!opener || displayedRef.current) return;
    displayedRef.current = true;
    emitProductLog({
      level: 'trace',
      route: '/dating/me-matches',
      message: 'conversation.opener_displayed',
      meta: {
        event: 'conversation.opener_displayed',
        matchProfileId: match.id,
        openerLength: opener.length,
        priorityScore: match.priorityScore ?? match.matchScore ?? null,
      },
    });
    postOpenerLifecycleBestEffort(match.id, 'displayed');
  }, [opener, match.id, match.priorityScore, match.matchScore]);

  if (!opener) return null;

  return (
    <div
      data-testid="match-opener-section"
      className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-3 dark:border-emerald-800/60 dark:bg-emerald-950/30"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        {browse.openerHeading}
      </p>
      <p
        className="mt-1.5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200"
        data-testid="match-opener-text"
      >
        {opener}
      </p>
      {waiting ? (
        <p
          className="mt-2 text-xs font-medium text-emerald-800/80 dark:text-emerald-300/80"
          data-testid="match-opener-waiting"
          role="status"
        >
          {browse.openerWaiting}
        </p>
      ) : canUse ? (
        <button
          type="button"
          data-testid="match-opener-use"
          aria-label={browse.useOpenerAria(displayName)}
          disabled={actionLoading}
          onClick={() => void onLikeAndUse()}
          className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {browse.useOpener}
        </button>
      ) : null}
    </div>
  );
}
